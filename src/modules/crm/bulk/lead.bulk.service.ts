import prisma from '@db/utils/prisma';
import { requireTenant, requirePermission } from '@/lib/auth';
import { LeadStatus } from '@prisma/client';
import globalPrisma from '@db/utils/prisma';
import { withTenantTransaction } from '@db/utils/prisma-tenant';

export const MAX_SYNC_BULK_SIZE = 500;

export class LeadBulkService {
  /**
   * Bulk updates lead statuses.
   */
  static async bulkUpdateStatus(leadIds: string[], status: LeadStatus, runAsync: boolean = false) {
    const tenantId = await requireTenant();
    await requirePermission('LEAD', 'UPDATE');

    if (leadIds.length === 0) return { count: 0 };
    if (leadIds.length > MAX_SYNC_BULK_SIZE) {
      if (!runAsync) throw new Error(`Exceeds max sync size of ${MAX_SYNC_BULK_SIZE}.`);
      return { count: leadIds.length, queued: true };
    }

    const result = await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
      const existing = await tx.lead.findMany({ where: { id: { in: leadIds }, tenantId }, select: { id: true } });
      const validIds = existing.map((e: any) => e.id);
      if (validIds.length === 0) return { count: 0 };

      const updateResult = await tx.lead.updateMany({
        where: { id: { in: validIds }, tenantId },
        data: { status }
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: 'SYSTEM_BULK',
          actorType: 'USER',
          action: 'BULK_UPDATE',
          resource: 'LEAD',
          resourceId: 'MULTIPLE',
          metadata: { count: validIds.length, targetStatus: status }
        }
      });

      const timelineData = validIds.map((id: string) => ({
        tenantId,
        entityId: id,
        entityType: 'LEAD' as any,
        type: 'SYSTEM' as any,
        content: `Lead status updated in bulk to ${status}`,
        actorId: 'SYSTEM_BULK'
      }));
      await tx.activityTimeline.createMany({ data: timelineData });

      return { count: updateResult.count };
    });

    return result;
  }

  /**
   * Bulk assigns owner.
   */
  static async bulkAssignOwner(leadIds: string[], assignedUserId: string, runAsync: boolean = false) {
    const tenantId = await requireTenant();
    await requirePermission('LEAD', 'UPDATE');

    if (leadIds.length === 0) return { count: 0 };
    if (leadIds.length > MAX_SYNC_BULK_SIZE) {
      if (!runAsync) throw new Error(`Exceeds max sync size of ${MAX_SYNC_BULK_SIZE}.`);
      return { count: leadIds.length, queued: true };
    }

    // Verify user exists in tenant
    const targetUser = await prisma.user.findFirst({ where: { id: assignedUserId, tenantId } });
    if (!targetUser) throw new Error("Assigned user not found in tenant.");

    const result = await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
      const existing = await tx.lead.findMany({ where: { id: { in: leadIds }, tenantId }, select: { id: true } });
      const validIds = existing.map((e: any) => e.id);
      if (validIds.length === 0) return { count: 0 };

      const updateResult = await tx.lead.updateMany({
        where: { id: { in: validIds }, tenantId },
        data: { assignedUserId }
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: 'SYSTEM_BULK',
          actorType: 'USER',
          action: 'BULK_ASSIGN',
          resource: 'LEAD',
          resourceId: 'MULTIPLE',
          metadata: { count: validIds.length, assignedUserId }
        }
      });

      return { count: updateResult.count };
    });

    // We can emit a domain event here so that the Notification Service handles it
    // EventBus.emit('leads.bulk.assigned', { tenantId, leadIds, assignedUserId });

    return result;
  }
}
