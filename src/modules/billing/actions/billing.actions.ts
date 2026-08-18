'use server';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { Resource, Action } from '@prisma/client';

export async function getSubscriptionAction() {
  try {
    const tenantId = await requireTenant();
    await requireAuth();
    await requirePermission(Resource.REVENUE, Action.READ);

    const prisma = withTenant(tenantId);
    
    // We get the first tenant subscription (assuming one active per tenant)
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId }
    });

    return { success: true, data: subscription };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
