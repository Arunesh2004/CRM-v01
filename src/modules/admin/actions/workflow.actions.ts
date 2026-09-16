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
    await requirePermission(Resource.SYSTEM, Action.UPDATE); // Admin

    const prisma = withTenant(tenantId);
    
    const workflows = await prisma.workflow.findMany({
      where: { tenantId },
      include: { triggers: true },
      orderBy: { name: 'asc' }
    });

    const data = workflows.map(wf => ({
      ...wf,
      triggerType: wf.triggers[0]?.eventType || 'Manual',
      isActive: wf.status === 'ACTIVE'
    }));

    return { success: true, data };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getWorkflowsAction = withServerActionContext(_getWorkflowsAction);
