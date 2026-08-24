import globalPrisma from '@db/utils/prisma';
import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { SecurityEventService } from '../security-events/security-event.service';
import { RequestAIExecutionInput, ApproveAIExecutionInput } from './types';
import { AIExecution, AITool, AIExecutionStatus, ActorType, Resource, Action } from '@prisma/client';
import { ABACPolicyService } from '../security/abac/abac-policy.service';

export class AIPermissionService {
  /**
   * Validates if a user has permission to execute an AI tool.
   * If they lack permissions, it blocks the action and logs a security event.
   * If the tool requires approval, sets status to WAITING_APPROVAL.
   */
  static async requestToolExecution(input: RequestAIExecutionInput, mockContext?: any): Promise<AIExecution> {
    const user = mockContext?.user || await requireAuth();
    const tenantId = mockContext?.tenantId || await requireTenant();

    const tool = await globalPrisma.aITool.findUnique({
      where: { name: input.toolName }
    });

    if (!tool) {
      throw new Error(`AI Tool ${input.toolName} not found.`);
    }

    // RBAC validation
    let hasPerm = true;
    if (tool.requiredPermission) {
      const [resource, action] = tool.requiredPermission.split(':');
      try {
        if (mockContext && mockContext.requirePermission) {
           await mockContext.requirePermission(resource, action);
        } else {
           await requirePermission(resource as Resource, action as Action);
        }
      } catch (error) {
        hasPerm = false;
      }

      // ABAC Integration
      if (hasPerm) {
        const abacResult = await ABACPolicyService.evaluatePolicies(tenantId, resource, action, input.input as Record<string, any>);
        if (abacResult === 'DENY') {
          hasPerm = false;
        }
      }
    }

    if (!hasPerm) {
      // 1. Log security event for blocked action
      await SecurityEventService.logEvent(tenantId, {
        eventType: 'AI_BLOCKED_ACTION',
        severity: tool.riskLevel === 'CRITICAL' || tool.riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM',
        source: 'ai_permission_engine',
        userId: user.id,
        metadata: {
          toolName: tool.name,
          reason: 'Insufficient RBAC permissions',
          input: input.input
        }
      }, 'AI', user.id);

      throw new Error('403: Forbidden - AI lacks inherited permission to execute this tool.');
    }

    const initialStatus: AIExecutionStatus = tool.requiresApproval ? 'WAITING_APPROVAL' : 'APPROVED';

    return await globalPrisma.$transaction(async (baseTx: any) => {
      const tx = await withTenantTransaction(baseTx, tenantId);

      // 1. Create AIExecution record
      const execution = await tx.aIExecution.create({
        data: {
          tenantId,
          userId: user.id,
          toolId: tool.id,
          status: initialStatus,
          input: input.input
        }
      });

      // 2. Dual-write AuditLog
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: user.id,
          actorType: 'AI',
          action: `AI_EXECUTION_REQUEST_${initialStatus}`,
          resource: 'SYSTEM',
          resourceId: execution.id,
          metadata: {
            toolName: tool.name,
            status: initialStatus
          }
        }
      });

      return execution;
    });
  }

  /**
   * Approves or rejects a pending AI execution (Human-in-the-loop).
   */
  static async approveExecution(input: ApproveAIExecutionInput): Promise<AIExecution> {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    
    // Check if the user has permission to approve AI actions
    await requirePermission('SYSTEM', 'UPDATE'); 

    const prisma = withTenant(tenantId);
    const execution = await prisma.aIExecution.findFirst({
      where: { id: input.executionId, tenantId },
      include: { tool: true }
    });

    if (!execution || execution.status !== 'WAITING_APPROVAL') {
      throw new Error('Execution not found or not waiting for approval');
    }

    const newStatus: AIExecutionStatus = input.approved ? 'APPROVED' : 'REJECTED';

    return await globalPrisma.$transaction(async (baseTx: any) => {
      const tx = await withTenantTransaction(baseTx, tenantId);

      const updated = await tx.aIExecution.update({
        where: { id: execution.id },
        data: {
          status: newStatus,
          approvedBy: user.id
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: user.id,
          actorType: 'USER',
          action: `AI_EXECUTION_${newStatus}`,
          resource: 'SYSTEM',
          resourceId: execution.id,
          metadata: {
            toolName: execution.tool.name,
            approverId: user.id
          }
        }
      });

      return updated;
    });
  }
}
