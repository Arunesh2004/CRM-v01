import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '../../../../database/utils/prisma-tenant';
import { getCurrentUserContext } from '@/lib/tenant-context';

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
  
  const prisma = withTenant(tenantId);
  
  return await prisma.$transaction(async (tx: any) => {
    // Validate target user exists and belongs to current tenant
    const targetUser = await tx.user.findFirst({
      where: {
        id: input.userId,
        tenantId
      }
    });

    if (!targetUser) {
      throw new Error("Related entity does not belong to this tenant: User");
    }

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
