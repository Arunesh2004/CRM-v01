'use server';
import { withServerActionContext } from '@/lib/observability/server-action';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';
import { Resource, Action } from '@prisma/client';

async function _getRolesAction() {
  try {
    const tenantId = await requireTenant();
    await requireAuth();
    await requirePermission(Resource.SYSTEM, Action.MANAGE_TERRITORIES);

    const prisma = withTenant(tenantId);
    
    const roles = await prisma.role.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: {
        permissions: true
      }
    });

    return { success: true, data: roles };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getRolesAction = withServerActionContext(_getRolesAction);
