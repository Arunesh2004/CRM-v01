import { NotificationProvider, SendNotificationDTO } from './notification.provider';

export class DemoNotificationProvider implements NotificationProvider {
  async send(payload: SendNotificationDTO): Promise<void> {
    console.log(`[DemoNotificationProvider] Sending notification to ${payload.userId} in tenant ${payload.tenantId}`);
    console.log(`[DemoNotificationProvider] Payload: ${payload.title} - ${payload.body}`);
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}
