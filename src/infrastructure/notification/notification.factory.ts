import { NotificationProvider } from '@/modules/notifications/providers/notification.provider';
import { DemoNotificationProvider } from '@/modules/notifications/providers/demo.provider';

export class NotificationProviderFactory {
  static getNotificationProvider(): NotificationProvider {
    // Currently using demo provider regardless of environment
    return new DemoNotificationProvider();
  }
}
