import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import globalPrisma from '../../../../database/utils/prisma';
import { SecurityEventService } from '../../../../src/modules/security-events/security-event.service';
import { AIPermissionService } from '../../../modules/ai-permissions/ai-permission.service';
import { ContextBuilderService } from '../context/context-builder.service';
import { inngest } from '@/lib/queue/inngest.client';
import { TaskCore } from '../../crm/task/task.core';
import { TicketService } from '../../support/ticket.service';
import { createIncident } from '../../incident/incident.service';

export class WorkflowService {
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  static async createWorkflow(tenantId: string, userId: string, data: any) {
    if (!tenantId || !userId) throw new Error('401: Unauthorized request context');

    const forbiddenFields = ['tenantId', 'createdById', 'userId', 'role', 'permissions', 'departmentId', 'actorId', 'actorType'];
    for (const field of forbiddenFields) {
      if (field in data) {
        throw new Error(`400: Forbidden authority-bearing field [${field}] provided in payload`);
      }
    }

    const prisma = withTenant(tenantId);
    return await prisma.workflow.create({
      data: { ...data, tenantId, createdById: userId }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  static async executeWorkflow(tenantId: string, userId: string | null, workflowId: string, triggerData?: any) {
    return await globalPrisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      
      const workflow = await tx.workflow.findFirst({
        where: { id: workflowId, tenantId }
      });
      if (!workflow) throw new Error('404: Workflow not found in tenant');

      const execution = await tx.workflowExecution.create({
        data: {
          tenantId,
          workflowId,
          status: 'PENDING',
          context: triggerData || {},
          initiatedById: userId,
        }
      });

      await tx.eventOutbox.create({
        data: {
          tenantId,
          eventId: execution.id,
          eventType: 'workflow.execute',
          payload: {
            jobId: execution.id,
            tenantId,
            actorType: 'SYSTEM',
            correlationId: execution.id,
            jobType: 'workflow.execute',
            payload: { workflowId: workflow.id, executionId: execution.id },
            schemaVersion: '1.0'
          }
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: userId || 'SYSTEM', 
          actorType: userId ? 'USER' : 'SYSTEM',
          action: 'EXECUTE',
          resource: 'SYSTEM',
          resourceId: execution.id,
          metadata: { workflowId, status: 'QUEUED' }
        }
      });
      
      return execution;
    });
  }

  static async getWorkflowActions(tenantId: string, workflowId: string, executionId: string) {
    const prisma = withTenant(tenantId);
    const execution = await prisma.workflowExecution.findFirst({
      where: { id: executionId, tenantId, workflowId }
    });
    if (!execution) throw new Error('SECURE_CONTEXT_ERROR: Execution not found');

    const { count: execClaimed } = await prisma.workflowExecution.updateMany({
      where: { id: executionId, status: 'PENDING' },
      data: { status: 'RUNNING' }
    });
    if (execClaimed === 0 && execution.status === 'PENDING') {
      throw new Error('SECURE_CONTEXT_ERROR: Concurrency race lost on workflow claim');
    }

    return await prisma.workflowAction.findMany({
      where: { workflowId, tenantId },
      orderBy: { orderIndex: 'asc' }
    });
   
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  static async executeAction(tenantId: string, workflowId: string, executionId: string, action: any) {
    const prisma = withTenant(tenantId);

    // 1. Load Workflow and Execution to verify tenant boundary
    const execution = await prisma.workflowExecution.findFirst({
      where: { id: executionId, tenantId },
      include: { workflow: true }
    });
    if (!execution || execution.workflowId !== workflowId) {
      throw new Error('SECURE_CONTEXT_ERROR: Workflow execution mismatch or not found');
    }
    const workflow = execution.workflow;

    if (execution.status === 'FAILED' || execution.status === 'COMPLETED') {
      throw new Error('Workflow execution is not active');
    }

    // 2. Load Creator and Rebuild Authority
    const creatorId = workflow.createdById;
    const creator = await prisma.user.findFirst({
      where: { id: creatorId, tenantId }
    });

    if (!creator || creator.status !== 'ACTIVE' || creator.deletedAt !== null) {
      await this.markExecutionFailed(tenantId, executionId, 'Creator is no longer authorized (Inactive/Deleted)');
      throw new Error('403: Forbidden - Workflow creator identity is no longer valid');
    }
    const creatorContext = await ContextBuilderService.buildUserContext(tenantId, creatorId);

    // 3. Setup or get Step
    let step = await prisma.workflowExecutionStep.findFirst({
      where: { executionId, actionId: action.id, tenantId }
    });

    if (!step) {
      step = await prisma.workflowExecutionStep.create({
        data: { tenantId, executionId, actionId: action.id, status: 'PENDING' }
      });
    }

    if (step.status === 'COMPLETED' || step.status === 'FAILED') {
       
      return { success: true, message: 'Already processed' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Intentional dynamic record for generic context
    const config = action.config as Record<string, any>;
    const forbiddenFields = ['tenantId', 'createdById', 'userId', 'actorId', 'actorType', 'role', 'permissions', 'departmentId', 'initiatedById'];
    for (const field of forbiddenFields) {
      if (config && field in config) {
        throw new Error(`400: Forbidden identity field [${field}] found in action configuration`);
      }
    }

    const mockContext = {
      user: creatorContext.user,
      tenantId,
      requirePermission: async (resource: string, actionStr: string) => {
        const req = `${resource}:${actionStr}`;
        if (!creatorContext.permissions.includes(req) && !creatorContext.permissions.includes('SYSTEM:ADMIN')) {
            throw new Error('403: Missing required permission');
        }
      }
    };

    const aiExec = await AIPermissionService.requestToolExecution({
      toolName: action.actionType,
      input: config
    }, mockContext);

    if (aiExec.status === 'WAITING_APPROVAL') {
      await prisma.workflowExecutionStep.update({
        where: { id: step.id },
        data: { status: 'PENDING' }
      });
      return { waitingApproval: true };
    }

    if (aiExec.status === 'REJECTED') {
      throw new Error('403: AI Execution request was rejected by an approver.');
    }

    // 4. AT-LEAST-ONCE DELIVERY WITH IDEMPOTENT SIDE EFFECTS
    //
    // CRITICAL: The idempotency key MUST be derived from stable, caller-independent identifiers
    // that are identical for both concurrent workers executing the same logical action.
    //
    // Previously this used `wf_step_${step.id}` — WRONG: two concurrent callers can both
    // race through the findFirst/create step creation path above and each create a distinct
    // WorkflowExecutionStep with a unique UUID. Different step.id → different idempotency key
    // → no collision → both workers proceed to create independent business rows.
    //
    // Correct: derive from executionId + action.id — both are known before step creation,
    // are stable, and are identical for all concurrent workers for the same logical operation.
     
    // The unique constraint on [tenantId, key] then correctly arbitrates the race.
    const idempotencyKeyStr = `wf_exec_${executionId}_action_${action.id}`;

    try {
       
      const result = await globalPrisma.$transaction(async (baseTx) => {
        // Set tenant context on the raw transaction client.
        // withTenantTransaction returns baseTx after calling set_config — the tenant RLS
        // context is now active on baseTx for this transaction's lifetime.
        await withTenantTransaction(baseTx, tenantId);

        // a) Concurrency Claim — insert IdempotencyKey using the raw baseTx.
        //    IdempotencyKey is intentionally NOT in the withTenant extension's RLS model list
        //    (see prisma-tenant.ts comment) precisely so it does not spawn a nested transaction.
        //    Using baseTx directly here is correct and consistent with that design.
        await baseTx.idempotencyKey.create({
          data: {
            tenantId,
            key: idempotencyKeyStr,
            operation: action.actionType,
            requestHash: idempotencyKeyStr,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        });

        // b) Static Dispatcher — pass baseTx as the external transaction client.
        //    IMPORTANT: downstream service methods receive baseTx, NOT the withTenant-extended
        //    client. This keeps all mutations inside the same atomic transaction. If we passed
        //    the withTenant-extended client, its $allOperations middleware would wrap each
        //    RLS-model mutation (Ticket, Incident, etc.) in an independent prisma.$transaction()
        //    that commits immediately — allowing the business row to escape the outer
        //    idempotency transaction and become durable even if the IdempotencyKey INSERT
        //    later fails due to a concurrent race.
        //
         
        //    Tenant isolation is enforced because set_config('app.current_tenant_id') has
        //    already been called on baseTx by withTenantTransaction above.
        let dispatchResult;
        switch (action.actionType) {
          case 'CREATE_TASK':
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
            dispatchResult = await TaskCore.createTask(baseTx, tenantId, creatorId, config as any);
            break;
          case 'CREATE_TICKET':
            dispatchResult = await TicketService.createTicket(
              tenantId,
              creatorId,
              config.customerId,
              config.subject,
              config.description,
              config.priority || 'MEDIUM',
               
              baseTx
            );
            break;
          case 'CREATE_INCIDENT':
            dispatchResult = await createIncident(
              {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
                ...config as any,
                explicitTenantId: tenantId,
                explicitUserId: creatorId
              },
              baseTx
            );
            break;
          default:
            throw new Error(`400: Unknown or unsupported action type: ${action.actionType}`);
        }

        // c) Mark Step COMPLETED — use baseTx so these mutations are also inside the
        //    same atomic transaction as the IdempotencyKey claim and the business mutation.
        await baseTx.workflowExecutionStep.updateMany({
          where: { id: step.id },
          data: { status: 'COMPLETED', result: JSON.stringify(dispatchResult) }
        });
        
        await baseTx.auditLog.create({
          data: {
            tenantId,
            actorId: creatorId, actorType: 'USER',
            action: 'EXECUTE',
            resource: 'SYSTEM',
            resourceId: step.id,
            metadata: { actionType: action.actionType, status: 'COMPLETED' }
          }
        });

        return dispatchResult;
      });

      return { success: true, waitingApproval: false, result };
    } catch (errorRaw: unknown) {
       
      const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
       
      // Narrow P2002 discrimination: ONLY treat a P2002 from the IdempotencyKey model
      // as a concurrency collision. A P2002 from any other model (e.g. Incident.aiEventId
      // @unique) must propagate as a real business error, not be silently swallowed.
      // We use meta.modelName (set by Prisma) as the authoritative discriminator,
      // matching the same logic used in src/lib/idempotency.ts isIdempotencyKeyConflict().
      const isIdempotencyCollision = (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
        (error as any).code === 'P2002' &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
        (error as any).meta?.modelName === 'IdempotencyKey'
      );

      if (isIdempotencyCollision) {
        // Concurrency race: another concurrent worker already claimed this idempotency key.
        // The outer transaction will be rolled back. The business mutation has NOT been
        // committed (it was inside the same baseTx), so no duplicate row exists.
        return { success: true, waitingApproval: false, skipped: true, reason: 'Duplicate execution prevented' };
      }

      await prisma.workflowExecutionStep.updateMany({
        where: { executionId, actionId: action.id },
        data: { status: 'FAILED', error: (error as Error).message }
      });

      await SecurityEventService.logEvent(tenantId, { eventType: 'AI_BLOCKED_ACTION', severity: 'HIGH', source: 'WorkflowEngine', metadata: { executionId, actionId: action.id, error: (error as Error).message } }, 'SYSTEM', 'SYSTEM');
      await this.markExecutionFailed(tenantId, executionId, (error as Error).message);
      throw error;
    }
   
  }

  static async markExecutionCompleted(tenantId: string, executionId: string) {
    await withTenant(tenantId).workflowExecution.updateMany({
      where: { id: executionId },
      data: { status: 'COMPLETED' }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
  static async markExecutionFailed(tenantId: string, executionId: string, error: string) {
    await withTenant(tenantId).workflowExecution.updateMany({
      where: { id: executionId },
      data: { status: 'FAILED' }
    });
  }
}
