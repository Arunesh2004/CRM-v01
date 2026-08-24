import prisma from '@db/utils/prisma';
import { NotificationType } from '@prisma/client';
import { NotificationProviderFactory } from '@/infrastructure/notification/notification.factory';

export interface CreateNotificationParams {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
}

export class NotificationService {
  static async sendNotification(params: CreateNotificationParams) {
    // 1. Persist to DB
    const notification = await prisma.notification.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        actionUrl: params.actionUrl
      }
    });

    // 2. Push to realtime provider
    const provider = NotificationProviderFactory.getNotificationProvider();
    
    // Fire and forget so we don't block
    provider.send({
      tenantId: params.tenantId,
      userId: params.userId,
      title: params.title,
      body: params.body,
      type: params.type,
      actionUrl: params.actionUrl
    }).catch(err => {
      console.error(`[NotificationService] Failed to push realtime notification:`, err);
    });

    return notification;
  }

  static async getNotifications(params?: { userId?: string, limit?: number }) {
    const { requireAuth, requireTenant, requirePermission } = await import('@/lib/auth');
    const { withTenant } = await import('@db/utils/prisma-tenant');
    
    const user = await requireAuth();
    const tenantId = await requireTenant();

    if (params?.userId && params.userId !== user.id) {
      await requirePermission('USER', 'READ');
    }

    const prismaTenant = withTenant(tenantId);
    const limit = params?.limit || 20;

    const where: any = { tenantId };
    if (params?.userId) {
      where.userId = params.userId;
    }

    return await prismaTenant.notification.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });
  }
}
