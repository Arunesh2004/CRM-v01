import { PaymentProvider, CheckoutPayload, CheckoutResponse, PaymentVerification } from './payment.interface';
import { ProviderContext, ProviderHealth } from '../base.interface';
import { randomUUID } from 'crypto';

export class DemoPaymentProvider implements PaymentProvider {
  async checkHealth(): Promise<ProviderHealth> {
    return {
      status: 'active',
      providerName: 'DemoPaymentProvider',
      message: 'Running in local simulation mode'
    };
  }

  async createCheckout(context: ProviderContext, payload: CheckoutPayload): Promise<CheckoutResponse> {
    console.log(`[DEMO_PAYMENT] Creating checkout for ${payload.amount} ${payload.currency}`);
    const transactionId = `demo_txn_${randomUUID()}`;

    return {
      checkoutUrl: payload.successUrl + '?demo_session_id=' + transactionId,
      transactionId,
      provider: 'DemoPaymentProvider'
    };
  }

  async verifyPayment(context: ProviderContext, transactionId: string): Promise<PaymentVerification> {
    console.log(`[DEMO_PAYMENT] Verifying payment ${transactionId}`);

    return {
      transactionId,
      isSuccessful: true,
      rawPayload: { demo: true }
    };
  }
}

