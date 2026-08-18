import prisma from '../../../../database/utils/prisma';
import { SecurityEventService } from '../../../../src/modules/security-events/security-event.service';
import { AIPermissionService } from '../../../modules/ai-permissions/ai-permission.service';

export class WorkflowService {
  /**
   * Execute a workflow step securely, ensuring AI Permission Engine handles RBAC/RLS
   */
  static async executeStep(
    tenantId: string,
    executionId: string,
    actionId: string,
    actionType: string,
    userId: string,
    inputData: any
  ) {
    try {
      // 1. Mark step as running
      await prisma.workflowExecutionStep.create({
        data: {
          tenantId,
          executionId,
          actionId,
          status: 'RUNNING',
        }
      });

      // 2. Delegate to Phase 8 AI Permission Engine
      // We check if the user actually has permission to execute this workflow action
      await AIPermissionService.requestToolExecution({
        toolName: actionType,
        input: inputData
      }, { user: { id: userId }, tenantId });

      // 3. Execute the action (Mock)
      const result = { success: true, action: actionType, data: inputData };

      // 4. Update step status
      await prisma.workflowExecutionStep.updateMany({
        where: { executionId, actionId },
        data: { status: 'COMPLETED', result: JSON.stringify(result) }
      });

      // 5. Audit Log (Phase 8 integration)
      await prisma.auditLog.create({
        data: {
          tenantId,
          actorId: userId, actorType: 'USER',
          action: 'EXECUTE',
          resource: 'SYSTEM',
          resourceId: executionId,
          metadata: { actionType, status: 'COMPLETED' }
        }
      });

      return result;

    } catch (error) {
      await prisma.workflowExecutionStep.updateMany({
        where: { executionId, actionId },
        data: { status: 'FAILED', error: (error as Error).message }
      });

      await SecurityEventService.logEvent(tenantId, { eventType: 'AI_BLOCKED_ACTION', severity: 'HIGH', source: 'WorkflowEngine', metadata: { executionId, actionId, error: (error as Error).message } }, 'USER', userId);

      throw error;
    }
  }
}
