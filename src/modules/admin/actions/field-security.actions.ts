'use server';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';
import { Resource, Action } from '@prisma/client';

export async function getFieldSecurityAction() {
  try {
    const tenantId = await requireTenant();
    await requireAuth();
    await requirePermission(Resource.SYSTEM, Action.MANAGE_TERRITORIES); // Admin

    const prisma = withTenant(tenantId);
    
    const configs = await prisma.fieldSecurityPolicy.findMany({
      where: { tenantId },
      orderBy: { modelName: 'asc' }
    });

    return { success: true, data: configs };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
