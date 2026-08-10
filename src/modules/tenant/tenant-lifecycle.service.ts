import prisma from '@/../database/utils/prisma';
import { requireAuth } from '@/lib/auth';

export async function requestTenantDeletion(tenantId: string, reason: string) {
  const user = await requireAuth();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { subscriptions: true }
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  if (tenant.ownerId !== user.id) {
    throw new Error('Forbidden: Only the Tenant Owner can request deletion');
  }

  // Check subscriptions and cancel if active (stub for future billing engine)
  const activeSubscription = tenant.subscriptions.find(s => s.status === 'ACTIVE');
  if (activeSubscription) {
    // In Phase 6 Billing, this would call stripe.subscriptions.cancel(activeSubscription.stripeId)
    console.log('Canceling active subscription for tenant:', tenantId);
  }

  const updatedTenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'DELETION_REQUESTED',
      deletedAt: new Date(),
      deletedById: user.id,
      deletionReason: reason,
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorId: user.id,
      actorType: 'USER',
      action: 'TENANT_DELETION_REQUESTED',
      resource: 'SYSTEM',
      resourceId: tenant.id,
      metadata: { reason }
    }
  });

  return updatedTenant;
}
