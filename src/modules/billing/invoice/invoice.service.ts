import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '../../../../database/utils/prisma-tenant';
import { getCurrentUserContext } from '@/lib/tenant-context';
import { CreateInvoiceInput, UpdateInvoiceStatusInput } from '../billing.types';

export async function createInvoice(input: CreateInvoiceInput) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('INVOICE', 'CREATE');
  const user = await getCurrentUserContext();
  
  const prisma = withTenant(tenantId);
  const sub = await prisma.subscription.findUnique({ where: { id: input.subscriptionId } });
  if (!sub) throw new Error('Subscription not found');

  return await prisma.$transaction(async (tx: any) => {
    const invoice = await tx.invoice.create({
      data: {
        tenantId,
        subscriptionId: input.subscriptionId,
        invoiceNumber: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        amount: input.amount,
        finalAmount: input.amount,
        status: 'DRAFT',
        issuedAt: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'INVOICE_CREATED',
        resource: 'INVOICE',
        resourceId: invoice.id
      }
    });

    return invoice;
  });
}

export async function updateInvoiceStatus(input: UpdateInvoiceStatusInput) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('INVOICE', 'UPDATE');
  const user = await getCurrentUserContext();
  
  const prisma = withTenant(tenantId);
  const invoice = await prisma.invoice.findUnique({ where: { id: input.invoiceId } });
  
  if (!invoice) throw new Error('Invoice not found');

  const transitions: Record<string, string[]> = {
    'DRAFT': ['OPEN'],
    'OPEN': ['PAID', 'VOID']
  };

  const allowed = transitions[invoice.status] || [];
  if (!allowed.includes(input.status)) {
    throw new Error(`Invalid invoice transition from ${invoice.status} to ${input.status}`);
  }

  return await prisma.$transaction(async (tx: any) => {
    const updated = await tx.invoice.update({
      where: { id: input.invoiceId },
      data: { status: input.status, paidAt: input.status === 'PAID' ? new Date() : undefined }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: `INVOICE_STATUS_UPDATED_${input.status}`,
        resource: 'INVOICE',
        resourceId: updated.id
      }
    });

    return updated;
  });
}
