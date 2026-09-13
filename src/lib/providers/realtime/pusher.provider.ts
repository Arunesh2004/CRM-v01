import Pusher from 'pusher';
import { RealtimeAdapter } from '@/lib/providers/realtime/realtime.adapter';
import { Logger } from '@/lib/observability/logger';

const logger = new Logger();

export class PusherRealtimeAdapter extends RealtimeAdapter {
  private pusher: Pusher;

  constructor() {
    super();
    this.pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async publishToUser(tenantId: string, userId: string, event: string, payload: any): Promise<void> {
    try {
      const channel = `private-tenant_${tenantId}_user_${userId}`;
      await this.pusher.trigger(channel, event, payload);
    } catch (error) {
      logger.error('Pusher publishToUser failed', error instanceof Error ? error : undefined, { tenantId, userId, event });
      throw new Error('REALTIME_PROVIDER_PUBLISH_FAILED');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async publishToChannel(tenantId: string, channelId: string, event: string, payload: any): Promise<void> {
    try {
      const channel = `private-tenant_${tenantId}_${channelId}`;
      await this.pusher.trigger(channel, event, payload);
    } catch (error) {
      logger.error('Pusher publishToChannel failed', error instanceof Error ? error : undefined, { tenantId, channelId, event });
      throw new Error('REALTIME_PROVIDER_PUBLISH_FAILED');
    }
  }
}

export class DegradedRealtimeAdapter extends RealtimeAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async publishToUser(tenantId: string, userId: string, event: string, payload: any): Promise<void> {
    logger.warn('Realtime delivery skipped: REALTIME_PROVIDER_NOT_CONFIGURED', { tenantId, userId, event });
    // Intentionally no fake success, but we don't throw to prevent breaking DB persistence for chat.
    if (event === 'incoming-call' || event.startsWith('webrtc-')) {
      throw new Error('REALTIME_PROVIDER_NOT_CONFIGURED'); // Calls MUST fail
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async publishToChannel(tenantId: string, channelId: string, event: string, payload: any): Promise<void> {
    logger.warn('Realtime delivery skipped: REALTIME_PROVIDER_NOT_CONFIGURED', { tenantId, channelId, event });
  }
}
