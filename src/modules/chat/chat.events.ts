import { NotificationService } from '@/modules/notifications/notification.service';
import { RealtimeFactory } from '@/infrastructure/realtime/factory';

export async function publishChatEvent(eventType: string, payload: any) {
  // Integrate with realtime provider
  const realtime = RealtimeFactory.getProvider();
  
  if (eventType === 'MESSAGE_SENT') {
    await realtime.sendToConversation(payload.conversationId, 'message:new', payload);
    
    // Check for mentions and trigger notifications
    if (payload.mentions && payload.mentions.length > 0) {
      for (const mention of payload.mentions) {
        await NotificationService.sendNotification({
          tenantId: payload.tenantId,
          userId: mention.userId,
          type: 'ALERT',
          title: 'New Mention',
          body: `You were mentioned in a message by ${payload.sender?.email || 'someone'}`,
          actionUrl: `/chat?conversationId=${payload.conversationId}`
        });
      }
    }
  } else if (eventType === 'MESSAGE_EDITED') {
    await realtime.sendToConversation(payload.conversationId, 'message:updated', payload);
  } else if (eventType === 'MESSAGE_DELETED') {
    await realtime.sendToConversation(payload.conversationId, 'message:deleted', payload);
  }
}
