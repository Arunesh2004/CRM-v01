import { NotificationProvider, SendNotificationDTO } from './notification.provider';
import { Logger } from '@/lib/logger/logger';

export class DemoNotificationProvider implements NotificationProvider {
  async send(payload: SendNotificationDTO): Promise<void> {
    Logger.info(`[DemoNotificationProvider] Sending notification`, { userId: payload.userId, tenantId: payload.tenantId });
    Logger.info(`[DemoNotificationProvider] Notification title dispatched`, { title: payload.title });
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}
