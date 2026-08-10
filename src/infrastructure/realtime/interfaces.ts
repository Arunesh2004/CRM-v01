export interface RealtimeProvider {
  sendToUser(userId: string, event: string, payload: any): Promise<void>;
  sendToConversation(conversationId: string, event: string, payload: any): Promise<void>;
  broadcast(channel: string, event: string, payload: any): Promise<void>;
}
