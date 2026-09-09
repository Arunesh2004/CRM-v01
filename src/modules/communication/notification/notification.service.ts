import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant, withTenantTransaction } from '../../../../database/utils/prisma-tenant';
import { getCurrentUserContext } from '@/lib/tenant-context';
import { requireRelationOwnership } from '@/lib/auth/relation-auth';
import globalPrisma from '@db/utils/prisma';

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
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  const prisma = withTenant(tenantId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  return await globalPrisma.$transaction(async (baseTx) => {
    const tx = await withTenantTransaction(baseTx, tenantId);

    await requireRelationOwnership(tx, tenantId, { user: input.userId });

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
