'use server';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant } from '@/lib/auth';
import { withTenant } from '@/../database/utils/prisma-tenant';

export async function getProductsAction() {
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
