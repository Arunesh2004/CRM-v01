'use server';
import { withServerActionContext } from '@/lib/observability/server-action';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';

async function _getProductsAction() {
  try {
    const tenantId = await requireTenant();
    await requireAuth();
    const prisma = withTenant(tenantId);
    
    const products = await prisma.product.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' }
    });

    return { success: true, data: products };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getProductsAction = withServerActionContext(_getProductsAction);
