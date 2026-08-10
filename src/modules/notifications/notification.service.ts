import prisma from '@/../database/utils/prisma';
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
}
