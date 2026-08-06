import { PaymentProvider, CheckoutSessionPayload, PaymentProviderResponse } from './payment.interface';
import { Logger } from '../../logger/logger';
import Razorpay from 'razorpay';
import crypto from 'crypto';

export class RazorpayProvider implements PaymentProvider {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_123',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_test',
    });
  }

  async createCustomer(tenantId: string, email: string, name: string): Promise<{ success: boolean; customerId?: string; error?: string }> {
    try {
      const customer = await this.razorpay.customers.create({
        email,
        name,
        notes: { tenantId }
      });
      return { success: true, customerId: customer.id as string };
    } catch (err: any) {
      Logger.error('Failed to create Razorpay Customer', err, { tenantId });
      return { success: false, error: err.message };
    }
  }

  async createCheckoutSession(tenantId: string, payload: CheckoutSessionPayload): Promise<PaymentProviderResponse> {
    try {
      if (payload.priceId) {
        // Handle Subscription Creation
        const subscription: any = await this.razorpay.subscriptions.create({
          plan_id: payload.priceId,
          customer_id: payload.customerId,
          total_count: 12,
          notes: { ...payload.metadata, tenantId }
        } as any);
        Logger.info(`Razorpay Subscription Session Created`, { tenantId, sessionId: subscription.id });
        return { success: true, sessionId: subscription.id, checkoutUrl: subscription.short_url };
      } else if (payload.amount && payload.currency) {
        // Handle Order Creation
        const order = await this.razorpay.orders.create({
          amount: payload.amount,
          currency: payload.currency,
          notes: { ...payload.metadata, tenantId }
        });
        Logger.info(`Razorpay Order Created`, { tenantId, sessionId: order.id });
        // Client side usually constructs checkoutUrl via short_url or SDK popup
        return { success: true, sessionId: order.id, checkoutUrl: `https://checkout.razorpay.com/v1/checkout.js?order_id=${order.id}` };
      }
      throw new Error('Must provide priceId or amount/currency');
    } catch (err: any) {
      Logger.error('Razorpay Checkout Creation Failed', err, { tenantId });
      return { success: false, error: err.message };
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_wh_secret';
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return expectedSignature === signature;
  }

  async createSubscription(customerId: string, planId: string): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    return { success: true, subscriptionId: 'sub_stub' };
  }
  async createPayment(invoiceId: string, amount: number, currency: string): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    return { success: true, transactionId: 'txn_stub' };
  }
  async refundPayment(transactionId: string, amount: number): Promise<{ success: boolean; refundId?: string; error?: string }> {
    return { success: true, refundId: 'ref_stub' };
  }
  async verifyWebhook(signature: string, payload: any): Promise<boolean> {
    return true;
  }
  async getSubscriptionStatus(providerSubscriptionId: string): Promise<{ success: boolean; status?: string; error?: string }> {
    return { success: true, status: 'active' };
  }
}
