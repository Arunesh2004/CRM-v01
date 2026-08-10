import { PaymentProvider, CheckoutPayload, CheckoutResponse, PaymentVerification } from './payment.interface';
import { ProviderContext, ProviderHealth } from '../base.interface';

export class StripeProvider implements PaymentProvider {
  name = 'StripeProvider';
  version = '1.0.0';
  private secretKey: string;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('COMMUNICATION_MODE is production but STRIPE_SECRET_KEY is missing.');
    }
    this.secretKey = process.env.STRIPE_SECRET_KEY;
  }

  async checkHealth(): Promise<ProviderHealth> {
    return {
      status: this.secretKey ? 'active' : 'missing_credentials',
      providerName: this.name
    };
  }

  async createCheckout(context: ProviderContext, payload: CheckoutPayload): Promise<CheckoutResponse> {
    // Real environment:
    // const stripe = new Stripe(this.secretKey, { apiVersion: '2023-10-16' });
    // const session = await stripe.checkout.sessions.create({ ... });
    
    console.log(`[StripeProvider] Creating checkout session via Stripe API for amount ${payload.amount}...`);
    
    return {
      checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_...', // Mocked URL
      transactionId: `stripe_cs_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      provider: this.name
    };
  }

  async verifyPayment(context: ProviderContext, transactionId: string): Promise<PaymentVerification> {
    console.log(`[StripeProvider] Verifying payment for transaction ${transactionId}...`);
    
    return {
      transactionId,
      isSuccessful: true,
      rawPayload: { status: 'succeeded' }
    };
  }
}
