export interface PaymentProvider {
  createCustomer(tenantIdOrData: any, email: any, name: any): Promise<any>;
  createSubscription(customerId: any, planId: any): Promise<any>;
  createPayment(invoiceId: any, amount: any, currency: any): Promise<any>;
  refundPayment(transactionId: any, amount: any): Promise<any>;
  verifyWebhook(signature: any, payload: any): Promise<any>;
  getSubscriptionStatus(providerSubscriptionId: any): Promise<any>;
  createCheckoutSession(tenantId: any, payload: any): Promise<any>;
}
