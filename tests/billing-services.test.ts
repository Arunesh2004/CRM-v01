import prisma from '../database/utils/prisma';
import { createSubscription, updateSubscriptionStatus } from '../src/modules/billing/subscription/subscription.service';
import { createInvoice, updateInvoiceStatus } from '../src/modules/billing/invoice/invoice.service';
import { createPaymentRecord, handlePaymentSuccess } from '../src/modules/billing/payment/payment.service';
import { recordUsage, getUsageSummary } from '../src/modules/billing/usage/usage.service';

async function runTests() {
  console.log('--- Running Billing Service Tests ---');
  
  // Setup Test Data
  const tenant = await prisma.tenant.create({ data: { name: 'Billing Test Tenant' }});
  const user = await prisma.user.create({ data: { clerkId: 'bill_test_' + Date.now(), email: `bill_${Date.now()}@test.com`, tenantId: tenant.id }});
  
  // Create Plan
  const plan = await prisma.plan.create({
    data: {
      name: 'Test Pro',
      price: 50,
      billingCycle: 'MONTHLY',
      limits: { maxUsers: 10 },
      features: { advanced: true }
    }
  });

  // Assign user context (bypassing auth middleware for integration tests)
  process.env.TEST_CLERK_ID = user.clerkId;
  
  // Provide permissions
  const role = await prisma.role.create({ data: { name: 'TENANT_ADMIN', tenantId: tenant.id }});
  await prisma.userRole.create({ data: { userId: user.id, roleId: role.id }});

  console.log('Testing Subscription Flow...');
  const sub = await createSubscription({ planId: plan.id });
  if (!sub || sub.status !== 'TRIAL') throw new Error('Subscription creation failed');
  
  const updatedSub = await updateSubscriptionStatus({ subscriptionId: sub.id, status: 'ACTIVE' });
  if (updatedSub.status !== 'ACTIVE') throw new Error('Subscription transition failed');
  console.log('✔ Subscription lifecycle rules passed');

  console.log('Testing Invoice Flow...');
  const invoice = await createInvoice({ subscriptionId: sub.id, amount: 50 });
  if (!invoice || invoice.status !== 'DRAFT') throw new Error('Invoice creation failed');
  
  const updatedInv = await updateInvoiceStatus({ invoiceId: invoice.id, status: 'OPEN' });
  if (updatedInv.status !== 'OPEN') throw new Error('Invoice transition failed');
  
  try {
    await updateInvoiceStatus({ invoiceId: invoice.id, status: 'DRAFT' });
    throw new Error('Allowed invalid invoice transition');
  } catch (err: any) {
    if (!err.message.includes('Invalid invoice transition')) throw new Error('Failed to enforce immutability');
  }
  console.log('✔ Invoice immutability passed');

  console.log('Testing Payment Flow...');
  const payment = await createPaymentRecord({ invoiceId: invoice.id, provider: 'STRIPE', amount: 50, currency: 'USD' });
  if (!payment || payment.status !== 'PENDING') throw new Error('Payment creation failed');
  
  const successResult = await handlePaymentSuccess(payment.transactionId);
  if (successResult.payment.status !== 'SUCCESS' || successResult.invoice.status !== 'PAID') {
    throw new Error('Payment success handling failed');
  }
  console.log('✔ Payment record creation passed');

  console.log('Testing Usage Flow...');
  await recordUsage({ type: 'USER', quantity: 5 });
  await recordUsage({ type: 'USER', quantity: 3 });
  
  const usageSummary = await getUsageSummary('USER');
  if (usageSummary.total !== 8) throw new Error('Usage summary aggregation failed');
  console.log('✔ Usage aggregation passed');

  console.log('Testing RBAC Denial...');
  await prisma.userRole.deleteMany({ where: { userId: user.id }}); // Strip permissions
  try {
    await createSubscription({ planId: plan.id });
    throw new Error('Should have failed permission check');
  } catch (err: any) {
    if (!err.message.includes('Forbidden')) throw new Error('Failed permission boundary check unexpectedly');
    console.log('✔ RBAC denial passed');
  }

  // Cleanup
  await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id }});
  await prisma.payment.deleteMany({ where: { tenantId: tenant.id }});
  await prisma.invoice.deleteMany({ where: { tenantId: tenant.id }});
  await prisma.subscription.deleteMany({ where: { tenantId: tenant.id }});
  await prisma.usageEvent.deleteMany({ where: { tenantId: tenant.id }});
  await prisma.plan.delete({ where: { id: plan.id }});
  await prisma.tenant.delete({ where: { id: tenant.id }});
  
  console.log('--- Tests Completed Successfully ---');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
