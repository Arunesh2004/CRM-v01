import { ChatProvider, ChatMessagePayload } from '../chat.interface';

export class DemoChatProvider implements ChatProvider {
  constructor(private tenantId: string) {}

  async sendMessage(payload: ChatMessagePayload): Promise<boolean> {
    // In Demo mode, we simulate a slight network delay, then assume the UI is either polling 
    // or using SSE to fetch the message that the domain service already wrote to the DB.
    console.log(`[DEMO CHAT] Broadcasting message for ${this.tenantId}:`, payload);
    await new Promise(resolve => setTimeout(resolve, 300));
    return true;
  }

  subscribeToConversation(conversationId: string, callback: (event: any) => void): void {
    console.log(`[DEMO CHAT] Subscribed to ${conversationId}`);
    // A real implementation would connect a WebSocket here.
  }

  unsubscribe(conversationId: string): void {
    console.log(`[DEMO CHAT] Unsubscribed from ${conversationId}`);
  }

  async broadcastTyping(conversationId: string, userId: string, isTyping: boolean): Promise<boolean> {
    console.log(`[DEMO CHAT] Typing indicator: user ${userId} in ${conversationId} isTyping=${isTyping}`);
    return true;
  }

  async updatePresence(userId: string, status: 'ONLINE' | 'OFFLINE' | 'AWAY'): Promise<boolean> {
    console.log(`[DEMO CHAT] User ${userId} presence updated to ${status}`);
    return true;
  }
}
