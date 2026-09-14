import prisma from '@db/utils/prisma';
import { NotificationType } from '@prisma/client';
import { NotificationProviderFactory } from '@/infrastructure/notification/notification.factory';
import { Logger } from '@/lib/logger/logger';

export interface CreateNotificationParams {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
}

// Ensure Prisma.TransactionClient is imported for typing
import { Prisma } from '@prisma/client';

export class NotificationService {
  static async queueNotification(tx: Prisma.TransactionClient, params: CreateNotificationParams) {
    // 1. Transactionally persist to EventOutbox
    // This guarantees notification dispatch only happens if the business transaction commits.
    const { randomUUID } = await import('crypto');
    
    await tx.eventOutbox.create({
      data: {
        tenantId: params.tenantId,
        eventId: randomUUID(),
        eventType: 'NOTIFICATION_SEND',
        payload: {
          tenantId: params.tenantId,
          userId: params.userId,
          type: params.type,
          title: params.title,
          body: params.body,
          actionUrl: params.actionUrl
        }
      }
    });
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
