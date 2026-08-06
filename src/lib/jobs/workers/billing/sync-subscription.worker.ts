import { BaseWorker } from '../worker.base';
import { Logger } from '../../../logger/logger';
import { JobContext } from '../../queue.interface';

export interface SyncSubscriptionPayload extends JobContext {
  subscriptionId: string;
  newStatus: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'SUSPENDED';
}

export class SyncSubscriptionWorker extends BaseWorker<SyncSubscriptionPayload> {
  constructor() {
    super('billing_subscription_queue');
  }

  protected async processJob(jobId: string, data: SyncSubscriptionPayload): Promise<void> {
    const { tenantId, subscriptionId, newStatus } = data;
    
    Logger.info(`Syncing subscription status`, { tenantId, subscriptionId, newStatus });

    // e.g. await prisma.subscription.update({ where: { id: subscriptionId, tenantId }, data: { status: newStatus } });
    
    if (newStatus === 'CANCELLED' || newStatus === 'SUSPENDED') {
      Logger.info(`Subscription ${newStatus}, triggering resource pause`, { tenantId });
      // Trigger side effects, lock accounts, etc.
    }
    
    // await prisma.auditLog.create({ ... });
  }
}
