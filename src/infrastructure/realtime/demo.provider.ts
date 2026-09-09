import { RealtimeProvider } from './interfaces';

/**
 * DemoRealtimeProvider
 * A basic local implementation that simulates realtime broadcast for development.
 * In a real Next.js app, this might insert events into a Redis stream or Postgres 
 * listen/notify system which the client polls or connects to via SSE.
 */
export class DemoRealtimeProvider implements RealtimeProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  async sendToUser(userId: string, event: string, payload: any): Promise<void> {
    console.log(`[DEMO REALTIME] To User ${userId} | Event: ${event}`, payload);
  }
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  async sendToConversation(conversationId: string, event: string, payload: any): Promise<void> {
    console.log(`[DEMO REALTIME] To Conversation ${conversationId} | Event: ${event}`, payload);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  async broadcast(channel: string, event: string, payload: any): Promise<void> {
    console.log(`[DEMO REALTIME] Broadcast to ${channel} | Event: ${event}`, payload);
  }
}
