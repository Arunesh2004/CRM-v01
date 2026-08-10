import { RealtimeProvider } from './interfaces';

/**
 * DemoRealtimeProvider
 * A basic local implementation that simulates realtime broadcast for development.
 * In a real Next.js app, this might insert events into a Redis stream or Postgres 
 * listen/notify system which the client polls or connects to via SSE.
 */
export class DemoRealtimeProvider implements RealtimeProvider {
  async sendToUser(userId: string, event: string, payload: any): Promise<void> {
    console.log(`[DEMO REALTIME] To User ${userId} | Event: ${event}`, payload);
  }

  async sendToConversation(conversationId: string, event: string, payload: any): Promise<void> {
    console.log(`[DEMO REALTIME] To Conversation ${conversationId} | Event: ${event}`, payload);
  }

  async broadcast(channel: string, event: string, payload: any): Promise<void> {
    console.log(`[DEMO REALTIME] Broadcast to ${channel} | Event: ${event}`, payload);
  }
}
