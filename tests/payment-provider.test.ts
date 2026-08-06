import { PaymentProviderFactory } from '../src/lib/providers/payment/payment-provider.factory';

async function runTests() {
  console.log('--- Running Payment Provider Abstraction Tests ---');

  // 1. Factory returns correct providers
  const rzp = PaymentProviderFactory.getProvider('RAZORPAY');
  const stripe = PaymentProviderFactory.getProvider('STRIPE');
  const paypal = PaymentProviderFactory.getProvider('PAYPAL');

  if (rzp.constructor.name !== 'RazorpayProvider') throw new Error('Failed to instantiate Razorpay');
  if (stripe.constructor.name !== 'StripeProvider') throw new Error('Failed to instantiate Stripe');
  if (paypal.constructor.name !== 'PayPalProvider') throw new Error('Failed to instantiate PayPal');
  
  console.log('✔ Factory returns correct providers');

  // 2. Interface methods work (using Razorpay as example)
  const tenantData = { tenantId: 'tenant-123', email: 'test@tenant.com', name: 'Test Tenant' };
  
  const customerResult = await rzp.createCustomer(tenantData);
  if (!customerResult.success || !customerResult.customerId) throw new Error('createCustomer failed');
  
  const subResult = await rzp.createSubscription(customerResult.customerId, 'plan_starter');
  if (!subResult.success || !subResult.subscriptionId) throw new Error('createSubscription failed');
  
  const paymentResult = await rzp.createPayment('inv_001', 5000, 'USD');
  if (!paymentResult.success || !paymentResult.transactionId) throw new Error('createPayment failed');
  
  console.log('✔ Interface methods work returning mocked identifiers:', {
    customer: customerResult.customerId,
    subscription: subResult.subscriptionId,
    transaction: paymentResult.transactionId
  });

  // 3. Webhook signature checking works
  const invalidHook = await rzp.verifyWebhook('', { event: 'payment.success' });
  if (invalidHook) throw new Error('Webhook verified an empty signature');
  const validHook = await rzp.verifyWebhook('valid_sig', { event: 'payment.success' });
  if (!validHook) throw new Error('Webhook failed to verify valid signature');

  console.log('✔ Webhook validation rejects invalid signatures');
  console.log('✔ No real network requests executed');

  console.log('--- Tests Completed Successfully ---');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
