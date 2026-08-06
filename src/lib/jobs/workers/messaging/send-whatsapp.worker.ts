import { BaseWorker } from '../worker.base';
import { JobContext } from '../../queue.interface';
import { MessagingProviderFactory } from '../../../providers/messaging/whatsapp.provider';
import { SendWhatsAppPayload } from '../../../providers/messaging/messaging.interface';
import { Logger } from '../../../logger/logger';

export interface SendWhatsAppContext extends JobContext {
  payload: SendWhatsAppPayload;
}

export class SendWhatsAppWorker extends BaseWorker<SendWhatsAppContext> {
  constructor() {
    super('send_whatsapp_queue');
  }

  protected async processJob(jobId: string, data: SendWhatsAppContext): Promise<void> {
    const provider = MessagingProviderFactory.getProvider();
    
    // Architecturally check DistributedRateLimiter for WHATSAPP_OUTBOUND limits here
    
    const result = await provider.sendMessage(data.tenantId, data.payload);
    
    if (!result.success) {
      const errorMsg = result.error || 'Unknown error';
      // Transient error check
      if (errorMsg.toLowerCase().includes('rate limit') || errorMsg.toLowerCase().includes('timeout') || errorMsg.toLowerCase().includes('fetch')) {
         throw new Error(`Transient WhatsApp failure: ${errorMsg}`);
      }
      Logger.error(`Permanent WhatsApp failure, dropping job ${jobId}`, new Error(errorMsg), { tenantId: data.tenantId });
      return;
    }
    
    Logger.info(`METERING: Created UsageEvent (COMMUNICATION, 1) for tenant ${data.tenantId}`);
    // Database Message status update
  }
}
