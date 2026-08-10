import { EventBus } from '../events/event-bus';
import { NotificationService } from '../../notifications/notification.service';
import { NotificationType } from '@prisma/client';

export function registerNotificationHandlers() {
  EventBus.on('lead.assigned', async (payload: { tenantId: string, leadId: string, assigneeId: string }) => {
    await NotificationService.sendNotification({
      tenantId: payload.tenantId,
      userId: payload.assigneeId,
      type: NotificationType.SYSTEM,
      title: 'New Lead Assigned',
      body: 'A new lead has been assigned to you.',
      actionUrl: `/leads/${payload.leadId}`
    });
  });

  EventBus.on('task.assigned', async (payload: { tenantId: string, taskId: string, assigneeId: string, title: string }) => {
    await NotificationService.sendNotification({
      tenantId: payload.tenantId,
      userId: payload.assigneeId,
      type: NotificationType.SYSTEM,
      title: 'Task Assigned',
      body: `You have been assigned to task: ${payload.title}`,
      actionUrl: `/tasks`
    });
  });

  EventBus.on('customer.updated', async (payload: { tenantId: string, customerId: string, name: string, ownerId: string }) => {
    // Notify the owner of the customer
    await NotificationService.sendNotification({
      tenantId: payload.tenantId,
      userId: payload.ownerId,
      type: NotificationType.ALERT,
      title: 'Customer Updated',
      body: `Customer ${payload.name} was updated.`,
      actionUrl: `/customers/${payload.customerId}`
    });
  });
}
