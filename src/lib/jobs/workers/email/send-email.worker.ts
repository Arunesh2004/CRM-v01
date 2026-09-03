import { BaseWorker } from '../worker.base';
import { JobContext } from '../../queue.interface';
import { EmailProviderFactory } from '../../../providers/email/email.factory';
import { EmailPayload } from '../../../providers/email/email.interface';
import { Logger } from '@/lib/logger/logger';

export interface EmailJobContext extends JobContext {
  payload: EmailPayload;
}

export class SendEmailWorker extends BaseWorker<EmailJobContext> {
  constructor() {
    super('send_email_queue');
  }

  protected async processJob(jobId: string, data: EmailJobContext): Promise<void> {
    const provider = EmailProviderFactory.getProvider();
    
    // Simulate bounce protection check before sending
    // const isBounced = await prisma.emailLog.findFirst({ where: { to: data.payload.to, status: 'BOUNCED' }})
    // if (isBounced) { Logger.warn('Prevented sending to bounced address'); return; }

    const result = await provider.sendEmail(data.tenantId, data.payload);
    
    if (!result.success) {
      const errorMsg = result.error || 'Unknown error';
      // Intelligent Retry Logic
      const isPermanentError = errorMsg.includes('invalid_email') || errorMsg.includes('rejected') || errorMsg.includes('not_found');
      
      if (isPermanentError) {
        Logger.error(`Permanent email failure, dropping job ${jobId}`, new Error(errorMsg), { tenantId: data.tenantId });
        return; // Do not throw, allowing job to naturally complete (fail) without retries
      }
      
      // Throw for 429 or network errors to trigger BullMQ exponential backoff
      throw new Error(`Transient email sending failed: ${errorMsg}`);
    }
    
    // Usage Metering (Architectural scaffold)
    Logger.info(`METERING: Created UsageEvent (COMMUNICATION, 1) for tenant ${data.tenantId}`, { jobId });
    // await prisma.usageEvent.create({ data: { tenantId: data.tenantId, type: 'COMMUNICATION', quantity: 1 } });
    
    // Architecturally: You would update local DB statuses here if needed (status: 'SENT')
  }
}
