import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import globalPrisma from '../../../../database/utils/prisma';
import { SecurityEventService } from '../../../../src/modules/security-events/security-event.service';
import { AIPermissionService } from '../../../modules/ai-permissions/ai-permission.service';
import { ContextBuilderService } from '../context/context-builder.service';
import { inngest } from '@/lib/queue/inngest.client';
import { TaskCore } from '../../crm/task/task.core';

export class WorkflowService {
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

  static async executeWorkflow(tenantId: string, userId: string | null, workflowId: string, triggerData?: any) {
    const prisma = withTenant(tenantId);
    
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, tenantId }
    });
    if (!workflow) throw new Error('404: Workflow not found in tenant');

    const execution = await prisma.workflowExecution.create({
      data: {
        tenantId,
        workflowId,
        status: 'PENDING',
        context: triggerData || {},
        initiatedById: userId,
      }
    });

    await inngest.send({
      name: 'workflow.execute',
      data: {
        jobId: execution.id,
        tenantId,
        actorType: 'SYSTEM',
        correlationId: execution.id,
        jobType: 'workflow.execute',
        payload: { workflowId: workflow.id, executionId: execution.id },
        schemaVersion: '1.0'
      }
    });

    await prisma.auditLog.create({
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
    const idempotencyKeyStr = `wf_step_${step.id}`;

    try {
      const result = await globalPrisma.$transaction(async (baseTx: any) => {
        const tx = await withTenantTransaction(baseTx, tenantId);

        // a) Concurrency Claim / Idempotency Key creation
        await tx.idempotencyKey.create({
          data: {
            tenantId,
            key: idempotencyKeyStr,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        });

        // b) Static Dispatcher inside transaction
        let dispatchResult;
        switch (action.actionType) {
          case 'CREATE_TASK':
            dispatchResult = await TaskCore.createTask(tx, tenantId, creatorId, config as any);
            break;
          default:
            throw new Error(`400: Unknown or unsupported action type: ${action.actionType}`);
        }

        // c) Mark Step COMPLETED
        await tx.workflowExecutionStep.updateMany({
          where: { id: step.id },
          data: { status: 'COMPLETED', result: JSON.stringify(dispatchResult) }
        });
        
        await tx.auditLog.create({
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
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Idempotency constraint hit - step already executed by another concurrent worker!
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

  static async markExecutionFailed(tenantId: string, executionId: string, error: string) {
    await withTenant(tenantId).workflowExecution.updateMany({
      where: { id: executionId },
      data: { status: 'FAILED' }
    });
  }
}
