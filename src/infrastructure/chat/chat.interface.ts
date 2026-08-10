export interface ChatMessagePayload {
  conversationId: string;
  senderId: string;
  content: string;
  type?: 'TEXT' | 'FILE' | 'SYSTEM';
  metadata?: any;
}

export interface ChatProvider {
  /**
   * Broadcasts a message over the realtime transport.
   * Assumes the message is already persisted to the database.
   */
  sendMessage(payload: ChatMessagePayload): Promise<boolean>;

  /**
   * Subscribes to a conversation for realtime events.
   */
  subscribeToConversation(conversationId: string, callback: (event: any) => void): void;

  /**
   * Unsubscribes from a conversation.
   */
  unsubscribe(conversationId: string): void;

  /**
   * Broadcasts a typing indicator.
   */
  broadcastTyping(conversationId: string, userId: string, isTyping: boolean): Promise<boolean>;

  /**
   * Updates user presence (online/offline).
   */
  updatePresence(userId: string, status: 'ONLINE' | 'OFFLINE' | 'AWAY'): Promise<boolean>;
}
