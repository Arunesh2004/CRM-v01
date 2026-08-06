import { ProcessPaymentWebhookWorker } from '../src/lib/jobs/workers/billing/process-payment-webhook.worker';
import { SyncSubscriptionWorker } from '../src/lib/jobs/workers/billing/sync-subscription.worker';
import { GenerateInvoiceWorker } from '../src/lib/jobs/workers/billing/generate-invoice.worker';
import { RefundPaymentWorker } from '../src/lib/jobs/workers/billing/refund-payment.worker';

async function runTests() {
  console.log('--- Running Billing Worker Tests ---');
  
  // 1. Setup Workers
  const paymentWorker = new ProcessPaymentWebhookWorker();
  const subWorker = new SyncSubscriptionWorker();
  const invoiceWorker = new GenerateInvoiceWorker();
  const refundWorker = new RefundPaymentWorker();

  // 2. Simulate Stripe Payment Success
  console.log('\\n[1] Testing ProcessPaymentWebhookWorker (Stripe Success)...');
  await (paymentWorker as any).processJob({
    data: {
      tenantId: 'tenant_stripe',
      provider: 'STRIPE',
      eventId: 'evt_stripe_success',
      eventType: 'checkout.session.completed',
      payload: {}
    }
  });

  // 3. Simulate Razorpay Payment Success
  console.log('\\n[2] Testing ProcessPaymentWebhookWorker (Razorpay Success)...');
  await (paymentWorker as any).processJob({
    data: {
      tenantId: 'tenant_rzp',
      provider: 'RAZORPAY',
      eventId: 'evt_rzp_success',
      eventType: 'payment.captured',
      payload: {}
    }
  });

  // 4. Simulate Failed Payment
  console.log('\\n[3] Testing ProcessPaymentWebhookWorker (Failed Payment)...');
  await (paymentWorker as any).processJob({
    data: {
      tenantId: 'tenant_failed',
      provider: 'STRIPE',
      eventId: 'evt_stripe_fail',
      eventType: 'invoice.payment_failed',
      payload: {}
    }
  });

  // 5. Simulate Subscription Cancellation
  console.log('\\n[4] Testing SyncSubscriptionWorker (Cancellation)...');
  await (subWorker as any).processJob({
    data: {
      tenantId: 'tenant_sub',
      subscriptionId: 'sub_123',
      newStatus: 'CANCELLED'
    }
  });

  // 6. Simulate Invoice Generation
  console.log('\\n[5] Testing GenerateInvoiceWorker (Invoice-first Lifecycle)...');
  await (invoiceWorker as any).processJob({
    data: {
      tenantId: 'tenant_inv',
      subscriptionId: 'sub_123',
      amount: 1000
    }
  });

  // 7. Simulate Refund
  console.log('\\n[6] Testing RefundPaymentWorker...');
  await (refundWorker as any).processJob({
    data: {
      tenantId: 'tenant_refund',
      transactionId: 'tx_123',
      reason: 'Customer requested'
    }
  });

  console.log('\\n--- Tests Completed Successfully ---');
  process.exit(0);
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
