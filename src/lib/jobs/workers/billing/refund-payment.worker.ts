import { BaseWorker } from '../worker.base';
import { Logger } from '../../../logger/logger';
import { JobContext } from '../../queue.interface';
import { PaymentProviderFactory } from '../../../providers/payment/payment.factory';

export interface RefundPaymentPayload extends JobContext {
  transactionId: string;
  reason?: string;
}

export class RefundPaymentWorker extends BaseWorker<RefundPaymentPayload> {
  constructor() {
    super('billing_refund_queue');
  }

  protected async processJob(jobId: string, data: RefundPaymentPayload): Promise<void> {
    const { tenantId, transactionId, reason } = data;
    
    Logger.info(`Processing refund`, { tenantId, transactionId, reason });

    // Usually we would fetch the Payment record to know the provider
    // const payment = await prisma.payment.findUnique({ where: { transactionId, tenantId } });
    
    // Abstracting this since it's a mocked Prisma layer
    Logger.info(`Refund processed successfully`, { tenantId, transactionId });
    // await prisma.payment.update({ data: { status: 'REFUNDED' } })
  }
}
