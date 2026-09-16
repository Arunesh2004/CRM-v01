export interface RealtimeProvider {
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  sendToUser(userId: string, event: string, payload: any): Promise<void>;
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  sendToConversation(conversationId: string, event: string, payload: any): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  broadcast(channel: string, event: string, payload: any): Promise<void>;
}
