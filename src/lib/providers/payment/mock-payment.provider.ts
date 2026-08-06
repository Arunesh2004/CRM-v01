import { PaymentProvider } from './payment-provider.interface';
import { Logger } from '../../logger/logger';

export class MockPaymentProvider implements PaymentProvider {
  async createCustomer(tenantId: string, email: string, name: string): Promise<string> {
    Logger.info(`[MOCK PAYMENT] Created customer for ${email}`, { tenantId });
    return `mock_cust_${Date.now()}`;
  }

  async createSubscription(customerId: string, planId: string): Promise<{ subscriptionId: string; status: string }> {
    Logger.info(`[MOCK PAYMENT] Created subscription for customer ${customerId}, plan ${planId}`);
    return { subscriptionId: `mock_sub_${Date.now()}`, status: 'active' };
  }

  async createPayment(invoiceId: string, amount: number, currency: string): Promise<{ paymentId: string; status: string }> {
    Logger.info(`[MOCK PAYMENT] Created payment for invoice ${invoiceId}, amount ${amount}`);
    return { paymentId: `mock_pay_${Date.now()}`, status: 'succeeded' };
  }

  async refundPayment(transactionId: string, amount: number): Promise<boolean> {
    Logger.info(`[MOCK PAYMENT] Refunded payment ${transactionId}, amount ${amount}`);
    return true;
  }

  async verifyWebhook(signature: string, payload: any): Promise<boolean> {
    return true;
  }

  async getSubscriptionStatus(providerSubscriptionId: string): Promise<string> {
    return 'active';
  }

  async createCheckoutSession(tenantId: string, payload: { planId: string; successUrl: string; cancelUrl: string }): Promise<{ sessionId: string; url: string }> {
    Logger.info(`[MOCK PAYMENT] Created checkout session for tenant ${tenantId}, plan ${payload.planId}`);
    // Simulate a successful checkout by just redirecting back to the success URL
    return { sessionId: `mock_sess_${Date.now()}`, url: `${payload.successUrl}?session_id=mock_sess_${Date.now()}&planId=${payload.planId}` };
  }
}
