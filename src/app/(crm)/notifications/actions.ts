'use server';
import { withServerActionContext } from '@/lib/observability/server-action';
import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';

import prisma from '@db/utils/prisma';
import { requireAuth, requireTenant } from '@/lib/auth';

async function _getUnreadNotificationsAction() {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  
  const notifications = await withTenant(tenantId).notification.findMany({
    where: { tenantId, userId: user.id, isRead: false },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  const count = await withTenant(tenantId).notification.count({
    where: { tenantId, userId: user.id, isRead: false }
  });

  return { notifications, count };
}
export const getUnreadNotificationsAction = withServerActionContext(_getUnreadNotificationsAction);

async function _markNotificationAsReadAction(id: string) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  
  await withTenant(tenantId).notification.updateMany({
    where: { id, tenantId, userId: user.id },
    data: { isRead: true }
  });
  
  return { success: true };
}
export const markNotificationAsReadAction = withServerActionContext(_markNotificationAsReadAction);
