import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant, withTenantTransaction } from '../../../../database/utils/prisma-tenant';
import { getCurrentUserContext } from '@/lib/tenant-context';
import { assertRelationOwnership } from '@/lib/security/tenant-guard';
import globalPrisma from '@/../database/utils/prisma';

export interface CreateNotificationInput {
  userId: string;
  type: 'ALERT' | 'REMINDER' | 'SYSTEM';
  title: string;
  body: string;
}

export async function createNotification(input: CreateNotificationInput) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('COMMUNICATION', 'CREATE');
  const user = await getCurrentUserContext();
  
  await assertRelationOwnership([{ model: 'user', id: input.userId }], tenantId);

  const prisma = withTenant(tenantId);
  
  return await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);

    const notification = await tx.notification.create({
      data: {
        tenantId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'NOTIFICATION_CREATED',
        resource: 'COMMUNICATION',
        resourceId: notification.id
      }
    });

    return notification;
  });
}
