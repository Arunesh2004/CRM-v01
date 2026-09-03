import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import prisma from '../../../database/utils/prisma';
import { realtime } from './adapter';

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(tenantId: string, userId: string, type: 'SYSTEM' | 'ALERT' | 'REMINDER', title: string, body: string) {
    const notification = await withTenant(tenantId).notification.create({
      data: {
        tenantId,
        userId,
        type,
        title,
        body,
        isRead: false
      }
    });

    await realtime.publishToUser(tenantId, userId, 'new_notification', notification);
    return notification;
  }

  /**
   * Get unread notifications
   */
  static async getUnreadNotifications(tenantId: string, userId: string, cursor?: string, take: number = 20) {
    return await withTenant(tenantId).notification.findMany({
      where: {
        tenantId,
        userId,
        isRead: false
      },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(tenantId: string, notificationId: string, userId: string) {
    const notification = await withTenant(tenantId).notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification || notification.tenantId !== tenantId || notification.userId !== userId) {
      throw new Error('Not authorized');
    }

    return await withTenant(tenantId).notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });
  }
}
