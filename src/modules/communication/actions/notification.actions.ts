'use server';
import { z } from 'zod';
import { MarkNotificationReadSchema } from '../validators/notification.schema';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '../../../../database/utils/prisma-tenant';
import { getCurrentUserContext } from '@/lib/tenant-context';

export async function getNotificationsAction() {
  try {
    await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('COMMUNICATION', 'READ');
    const user = await getCurrentUserContext();
    
    const prisma = withTenant(tenantId);
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: notifications };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markNotificationReadAction(payload: z.infer<typeof MarkNotificationReadSchema>) {
  try {
    const validatedData = MarkNotificationReadSchema.parse(payload);
    await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('COMMUNICATION', 'UPDATE');
    const user = await getCurrentUserContext();

    const prisma = withTenant(tenantId);
    await prisma.notification.update({
      where: { id: validatedData.notificationId, userId: user.id },
      data: { isRead: true }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
