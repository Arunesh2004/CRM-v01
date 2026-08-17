export abstract class RealtimeAdapter {
  abstract publishToUser(tenantId: string, userId: string, event: string, payload: any): Promise<void>;
  abstract publishToChannel(tenantId: string, channelId: string, event: string, payload: any): Promise<void>;
}

export class MockRealtimeAdapter extends RealtimeAdapter {
  async publishToUser(tenantId: string, userId: string, event: string, payload: any): Promise<void> {
    console.log(`[Realtime:User] Tenant: ${tenantId}, User: ${userId}, Event: ${event}`);
  }
  
  async publishToChannel(tenantId: string, channelId: string, event: string, payload: any): Promise<void> {
    console.log(`[Realtime:Channel] Tenant: ${tenantId}, Channel: ${channelId}, Event: ${event}`);
  }
}

export const realtime = new MockRealtimeAdapter();
