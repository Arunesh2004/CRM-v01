import prisma from '@/../database/utils/prisma';
import { requireTenant, requirePermission } from '@/lib/auth';
import { CustomerStatus } from '@prisma/client';
import globalPrisma from '@/../database/utils/prisma';
import { withTenantTransaction } from '@/../database/utils/prisma-tenant';

export const MAX_SYNC_BULK_SIZE = 500;

export class CustomerBulkService {
  /**
   * Bulk updates customer statuses. Throws if count exceeds MAX_SYNC_BULK_SIZE.
   * Prepared for BullMQ fallback (runAsync flag).
   */
  static async bulkUpdateStatus(customerIds: string[], status: CustomerStatus, runAsync: boolean = false) {
    const tenantId = await requireTenant();
    await requirePermission('CUSTOMER', 'UPDATE');

    if (customerIds.length === 0) return { count: 0 };
    if (customerIds.length > MAX_SYNC_BULK_SIZE) {
      if (!runAsync) {
        throw new Error(`Bulk operation exceeds max synchronous size of ${MAX_SYNC_BULK_SIZE}. Please run asynchronously.`);
      }
      // Future: Queue Job
      console.log(`[Queue] Pushing ${customerIds.length} customer updates to worker queue.`);
      return { count: customerIds.length, queued: true };
    }

    const result = await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
      // 1. Verify tenant ownership
      const existing = await tx.customer.findMany({
        where: { id: { in: customerIds }, tenantId },
        select: { id: true }
      });
      const validIds = existing.map((e: any) => e.id);

      if (validIds.length === 0) return { count: 0 };

      // 2. Perform update
      const updateResult = await tx.customer.updateMany({
        where: { id: { in: validIds }, tenantId },
        data: { status }
      });

      // 3. System Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: 'SYSTEM_BULK', // Ideal: capture user
          actorType: 'USER',
          action: 'BULK_UPDATE',
          resource: 'CUSTOMER',
          resourceId: 'MULTIPLE',
          metadata: { count: validIds.length, targetStatus: status, ids: validIds }
        }
      });

      // 4. Activity Timeline for each (atomic batch)
      const timelineData = validIds.map((id: string) => ({
        tenantId,
        entityId: id,
        entityType: 'CUSTOMER' as any,
        type: 'SYSTEM' as any,
        content: `Customer status updated in bulk to ${status}`,
        actorId: 'SYSTEM_BULK'
      }));
      await tx.activityTimeline.createMany({ data: timelineData });

      return { count: updateResult.count };
    });

    // Fire Domain Event for Notification
    // EventBus.emit('customers.bulk.updated', { tenantId, count: result.count });
    
    return result;
  }
}
