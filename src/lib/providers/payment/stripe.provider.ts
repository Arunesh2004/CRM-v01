import { PaymentProvider, CheckoutSessionPayload, PaymentProviderResponse } from './payment.interface';
import { Logger } from '../../logger/logger';
import Stripe from 'stripe';

export class StripeProvider implements PaymentProvider {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_123', {
      apiVersion: '2026-07-29.dahlia' as any,
    });
  }

  async createCustomer(tenantId: string, email: string, name: string): Promise<{ success: boolean; customerId?: string; error?: string }> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: { tenantId }
      });
      return { success: true, customerId: customer.id };
    } catch (err: any) {
      Logger.error('Failed to create Stripe Customer', err, { tenantId });
      return { success: false, error: err.message };
    }
  }

  async createCheckoutSession(tenantId: string, payload: CheckoutSessionPayload): Promise<PaymentProviderResponse> {
    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        mode: payload.priceId ? 'subscription' : 'payment',
        success_url: payload.successUrl,
        cancel_url: payload.cancelUrl,
        customer: payload.customerId,
        client_reference_id: tenantId,
        metadata: payload.metadata || {},
      };

      if (payload.priceId) {
        sessionParams.line_items = [{ price: payload.priceId, quantity: 1 }];
      } else if (payload.amount && payload.currency) {
        sessionParams.line_items = [
          {
            price_data: {
              currency: payload.currency,
              product_data: { name: 'Custom Invoice Payment' },
              unit_amount: payload.amount,
            },
            quantity: 1,
          },
        ];
      }

      const session = await this.stripe.checkout.sessions.create(sessionParams);
      Logger.info(`Stripe Checkout Session Created`, { tenantId, sessionId: session.id });

      return { success: true, sessionId: session.id, checkoutUrl: session.url || '' };
    } catch (err: any) {
      Logger.error('Stripe Checkout Creation Failed', err, { tenantId });
      return { success: false, error: err.message };
    }
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    const secret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
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
