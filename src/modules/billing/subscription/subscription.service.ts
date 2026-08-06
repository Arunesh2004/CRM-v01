import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '../../../../database/utils/prisma-tenant';
import { getCurrentUserContext } from '@/lib/tenant-context';
import { CreateSubscriptionInput, UpdateSubscriptionStatusInput } from '../billing.types';

export async function createSubscription(input: CreateSubscriptionInput) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('SUBSCRIPTION', 'CREATE');
  const user = await getCurrentUserContext();
  
  const prisma = withTenant(tenantId);
  
  // Validate plan exists
  const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
  if (!plan) throw new Error('Plan not found');

  return await prisma.$transaction(async (tx: any) => {
    const sub = await tx.subscription.create({
      data: {
        tenantId,
        planId: input.planId,
        status: 'TRIAL',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 day trial
        renewalDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'SUBSCRIPTION_CREATED',
        resource: 'SUBSCRIPTION',
        resourceId: sub.id
      }
    });

    return sub;
  });
}

export async function updateSubscriptionStatus(input: UpdateSubscriptionStatusInput) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('SUBSCRIPTION', 'UPDATE');
  const user = await getCurrentUserContext();
  
  const prisma = withTenant(tenantId);
  const sub = await prisma.subscription.findUnique({ where: { id: input.subscriptionId } });
  
  if (!sub) throw new Error('Subscription not found');

  // Allowed transitions
  const transitions: Record<string, string[]> = {
    'TRIAL': ['ACTIVE'],
    'ACTIVE': ['PAST_DUE', 'CANCELLED'],
    'PAST_DUE': ['ACTIVE', 'SUSPENDED'],
    'SUSPENDED': ['ACTIVE']
  };

  const allowed = transitions[sub.status] || [];
  if (!allowed.includes(input.status)) {
    throw new Error(`Invalid subscription transition from ${sub.status} to ${input.status}`);
  }

  return await prisma.$transaction(async (tx: any) => {
    const updated = await tx.subscription.update({
      where: { id: input.subscriptionId },
      data: { status: input.status, cancelledAt: input.status === 'CANCELLED' ? new Date() : undefined }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: `SUBSCRIPTION_STATUS_UPDATED_${input.status}`,
        resource: 'SUBSCRIPTION',
        resourceId: updated.id
      }
    });

    return updated;
  });
}
