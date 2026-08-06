import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '../../../../database/utils/prisma-tenant';
import { getCurrentUserContext } from '@/lib/tenant-context';
import { CreatePaymentRecordInput } from '../billing.types';
import { PaymentProviderFactory, SupportedPaymentProvider } from '@/lib/providers/payment/payment-provider.factory';
import prisma from '../../../../database/utils/prisma';

export async function createPaymentRecord(input: CreatePaymentRecordInput) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('PAYMENT', 'CREATE');
  const user = await getCurrentUserContext();
  
  const prisma = withTenant(tenantId);
  const invoice = await prisma.invoice.findUnique({ where: { id: input.invoiceId } });
  if (!invoice) throw new Error('Invoice not found');
  
  if (invoice.status === 'PAID') throw new Error('Invoice already paid');

  const provider = PaymentProviderFactory.getProvider(input.provider as SupportedPaymentProvider);
  const result = await provider.createPayment(invoice.id, input.amount, input.currency);

  if (!result.success || !result.transactionId) {
    throw new Error('Payment provider failed to initiate transaction');
  }

  return await prisma.$transaction(async (tx: any) => {
    const payment = await tx.payment.create({
      data: {
        tenantId,
        invoiceId: input.invoiceId,
        provider: input.provider,
        transactionId: result.transactionId,
        status: 'PENDING'
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'PAYMENT_INITIATED',
        resource: 'PAYMENT',
        resourceId: payment.id
      }
    });

    return payment;
  });
}

export async function handlePaymentSuccess(transactionId: string) {
  // Normally called by Webhook. To simulate auth, we bypass requireAuth but enforce tenant isolation in real apps via webhook processing.
  // For this abstraction layer, we assume it's securely processed.
  // We'll use a raw DB call to get the payment, but update via tenant logic.
  
  const rawPayment = await prisma.payment.findUnique({ where: { transactionId } });
  if (!rawPayment) throw new Error('Payment not found');

  const tenantId = rawPayment.tenantId;
  const tenantPrisma = withTenant(tenantId);
  
  return await tenantPrisma.$transaction(async (tx: any) => {
    const updatedPayment = await tx.payment.update({
      where: { transactionId },
      data: { status: 'SUCCESS' }
    });

    const invoice = await tx.invoice.update({
      where: { id: updatedPayment.invoiceId },
      data: { status: 'PAID', paidAt: new Date() }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: 'SYSTEM',
        actorType: 'SYSTEM',
        action: 'PAYMENT_SUCCESS',
        resource: 'PAYMENT',
        resourceId: updatedPayment.id
      }
    });

    return { payment: updatedPayment, invoice };
  });
}
