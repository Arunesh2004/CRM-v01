import prisma from '@/../database/utils/prisma';
import { requireTenant, requirePermission } from '@/lib/auth';
import { TaskStatus } from '@prisma/client';
import globalPrisma from '@/../database/utils/prisma';
import { withTenantTransaction } from '@/../database/utils/prisma-tenant';

export const MAX_SYNC_BULK_SIZE = 500;

export class TaskBulkService {
  /**
   * Bulk completes tasks.
   */
  static async bulkCompleteTasks(taskIds: string[], runAsync: boolean = false) {
    const tenantId = await requireTenant();
    await requirePermission('TASK', 'UPDATE');

    if (taskIds.length === 0) return { count: 0 };
    if (taskIds.length > MAX_SYNC_BULK_SIZE) {
      if (!runAsync) throw new Error(`Exceeds max sync size of ${MAX_SYNC_BULK_SIZE}.`);
      return { count: taskIds.length, queued: true };
    }

    const result = await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
      const existing = await tx.task.findMany({ where: { id: { in: taskIds }, tenantId }, select: { id: true } });
      const validIds = existing.map((e: any) => e.id);
      if (validIds.length === 0) return { count: 0 };

      const updateResult = await tx.task.updateMany({
        where: { id: { in: validIds }, tenantId },
        data: { status: 'COMPLETED' }
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: 'SYSTEM_BULK',
          actorType: 'USER',
          action: 'BULK_UPDATE',
          resource: 'TASK',
          resourceId: 'MULTIPLE',
          metadata: { count: validIds.length, targetStatus: 'COMPLETED' }
        }
      });

      const timelineData = validIds.map((id: string) => ({
        tenantId,
        entityId: id,
        entityType: 'TASK' as any,
        type: 'SYSTEM' as any,
        content: `Task completed in bulk`,
        actorId: 'SYSTEM_BULK'
      }));
      await tx.activityTimeline.createMany({ data: timelineData });

      return { count: updateResult.count };
    });

    return result;
  }

  /**
   * Bulk assigns task owner.
   */
  static async bulkAssignTasks(taskIds: string[], assignedUserId: string, runAsync: boolean = false) {
    const tenantId = await requireTenant();
    await requirePermission('TASK', 'UPDATE');

    if (taskIds.length === 0) return { count: 0 };
    if (taskIds.length > MAX_SYNC_BULK_SIZE) {
      if (!runAsync) throw new Error(`Exceeds max sync size of ${MAX_SYNC_BULK_SIZE}.`);
      return { count: taskIds.length, queued: true };
    }

    const targetUser = await prisma.user.findFirst({ where: { id: assignedUserId, tenantId } });
    if (!targetUser) throw new Error("Assigned user not found in tenant.");

    const result = await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
      const existing = await tx.task.findMany({ where: { id: { in: taskIds }, tenantId }, select: { id: true } });
      const validIds = existing.map((e: any) => e.id);
      if (validIds.length === 0) return { count: 0 };

      const updateResult = await tx.task.updateMany({
        where: { id: { in: validIds }, tenantId },
        data: { assignedUserId }
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: 'SYSTEM_BULK',
          actorType: 'USER',
          action: 'BULK_ASSIGN',
          resource: 'TASK',
          resourceId: 'MULTIPLE',
          metadata: { count: validIds.length, assignedUserId }
        }
      });

      return { count: updateResult.count };
    });

    // EventBus.emit('tasks.bulk.assigned', { tenantId, taskIds, assignedUserId });

    return result;
  }
}
