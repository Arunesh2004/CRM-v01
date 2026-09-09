export interface ChatMessagePayload {
  conversationId: string;
  senderId: string;
  content: string;
  type?: 'TEXT' | 'FILE' | 'SYSTEM';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
