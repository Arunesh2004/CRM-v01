export interface CheckoutSessionPayload {
  customerId?: string;
  customerEmail?: string;
  priceId?: string; // used for subscriptions
  amount?: number;  // used for one-time or custom invoices (cents)
  currency?: string;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentProviderResponse {
  success: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  error?: string;
}

export interface PaymentProvider {
  createCheckoutSession(tenantId: string, payload: CheckoutSessionPayload): Promise<PaymentProviderResponse>;
  createCustomer(tenantId: string, email: string, name: string): Promise<{ success: boolean; customerId?: string; error?: string }>;
}
