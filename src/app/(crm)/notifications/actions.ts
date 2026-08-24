'use server';

import prisma from '@db/utils/prisma';
import { requireAuth, requireTenant } from '@/lib/auth';

export async function getUnreadNotificationsAction() {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  
  const notifications = await prisma.notification.findMany({
    where: { tenantId, userId: user.id, isRead: false },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  const count = await prisma.notification.count({
    where: { tenantId, userId: user.id, isRead: false }
  });

  return { notifications, count };
}

export async function markNotificationAsReadAction(id: string) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  
  await prisma.notification.updateMany({
    where: { id, tenantId, userId: user.id },
    data: { isRead: true }
  });
  
  return { success: true };
}
