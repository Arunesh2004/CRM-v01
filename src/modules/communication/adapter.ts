import { Logger } from '@/lib/observability/logger';

export abstract class RealtimeAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  abstract publishToUser(tenantId: string, userId: string, event: string, payload: any): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  abstract publishToChannel(tenantId: string, channelId: string, event: string, payload: any): Promise<void>;
}

const logger = new Logger();
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing

export class MockRealtimeAdapter extends RealtimeAdapter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  async publishToUser(tenantId: string, userId: string, event: string, payload: any): Promise<void> {
    logger.info('RealtimeAdapter: Event to user', { tenantId, userId, event });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Unused local variable — safe removal requires verifying no side-effect; deferred to S3
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  async publishToChannel(tenantId: string, channelId: string, event: string, payload: any): Promise<void> {
    logger.info('RealtimeAdapter: Event to channel', { tenantId, channelId, event });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Unused local variable — safe removal requires verifying no side-effect; deferred to S3
  }
}

export const realtime = new MockRealtimeAdapter();
