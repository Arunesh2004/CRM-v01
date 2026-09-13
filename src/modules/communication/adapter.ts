import { Logger } from '@/lib/observability/logger';
import { ProviderFactory } from '@/lib/providers/provider.factory';
import { RealtimeAdapter } from '@/lib/providers/realtime/realtime.adapter';

export { RealtimeAdapter };

const logger = new Logger();

export class MockRealtimeAdapter extends RealtimeAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async publishToUser(tenantId: string, userId: string, event: string, payload: any): Promise<void> {
    logger.info('RealtimeAdapter: Event to user', { tenantId, userId, event });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async publishToChannel(tenantId: string, channelId: string, event: string, payload: any): Promise<void> {
    logger.info('RealtimeAdapter: Event to channel', { tenantId, channelId, event });
  }
}

export const realtime = ProviderFactory.getRealtimeProvider();
