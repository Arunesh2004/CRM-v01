import { PaymentProvider } from './payment-provider.interface';

export class PayPalProvider implements PaymentProvider {
  async createCustomer(tenantData: { tenantId: string; email: string; name: string }) {
    return { success: true, customerId: `cus_pp_${Date.now()}` };
  }

  async createSubscription(customerId: string, planId: string) {
    return { success: true, subscriptionId: `I-pp_${Date.now()}` };
  }

  async createPayment(invoiceId: string, amount: number, currency: string) {
    return { success: true, transactionId: `PAYID-pp_${Date.now()}` };
  }

  async refundPayment(transactionId: string, amount: number) {
    return { success: true, refundId: `REFID-pp_${Date.now()}` };
  }

  async verifyWebhook(signature: string, payload: any) {
    if (!signature) return false;
    return true;
  }

  async getSubscriptionStatus(providerSubscriptionId: string) {
    return { success: true, status: 'ACTIVE' };
  }

  async createCheckoutSession(tenantId: string, payload: any) {
    return { success: true, sessionId: `sess_pp_${Date.now()}` };
  }
}
