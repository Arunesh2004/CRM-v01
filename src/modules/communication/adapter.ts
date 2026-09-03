import { Logger } from '@/lib/observability/logger';

export abstract class RealtimeAdapter {
  abstract publishToUser(tenantId: string, userId: string, event: string, payload: any): Promise<void>;
  abstract publishToChannel(tenantId: string, channelId: string, event: string, payload: any): Promise<void>;
}

const logger = new Logger();

export class MockRealtimeAdapter extends RealtimeAdapter {
  async publishToUser(tenantId: string, userId: string, event: string, payload: any): Promise<void> {
    logger.info('RealtimeAdapter: Event to user', { tenantId, userId, event });
  }
  
  async publishToChannel(tenantId: string, channelId: string, event: string, payload: any): Promise<void> {
    logger.info('RealtimeAdapter: Event to channel', { tenantId, channelId, event });
  }
}

export const realtime = new MockRealtimeAdapter();
