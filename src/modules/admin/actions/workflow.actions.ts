'use server';
import { withServerActionContext } from '@/lib/observability/server-action';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';
import { Resource, Action } from '@prisma/client';

async function _getWorkflowsAction() {
  try {
    const tenantId = await requireTenant();
    await requireAuth();
    await requirePermission(Resource.SYSTEM, Action.MANAGE_TERRITORIES); // Admin

    const prisma = withTenant(tenantId);
    
    const workflows = await prisma.workflow.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' }
    });

    return { success: true, data: workflows };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getWorkflowsAction = withServerActionContext(_getWorkflowsAction);
