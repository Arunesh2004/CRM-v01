'use server';
import { withServerActionContext } from '@/lib/observability/server-action';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';

async function _getTerritoriesAction() {
  try {
    const tenantId = await requireTenant();
    await requireAuth();
    const prisma = withTenant(tenantId);
    
    const territories = await prisma.territory.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' }
    });

    return { success: true, data: territories };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getTerritoriesAction = withServerActionContext(_getTerritoriesAction);
