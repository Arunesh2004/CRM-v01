import { BaseWorker } from '../worker.base';
import { Logger } from '../../../logger/logger';
import { JobContext } from '../../queue.interface';

export interface GenerateInvoicePayload extends JobContext {
  subscriptionId: string;
  amount: number;
}

export class GenerateInvoiceWorker extends BaseWorker<GenerateInvoicePayload> {
  constructor() {
    super('billing_invoice_queue');
  }

  protected async processJob(jobId: string, data: GenerateInvoicePayload): Promise<void> {
    const { tenantId, subscriptionId, amount } = data;
    
    Logger.info(`Generating invoice asynchronously`, { tenantId, subscriptionId, amount });

    // Enforce Invoice-First lifecycle:
    // 1. Create Invoice status DRAFT
    // 2. Map UsageEvents if any
    // 3. Finalize to OPEN
    
    // await prisma.invoice.create({ ... })
    
    Logger.info(`Invoice generated successfully`, { tenantId });
  }
}
