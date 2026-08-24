'use server';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';
import { Resource, Action } from '@prisma/client';

export async function getCallsAction() {
  try {
    const tenantId = await requireTenant();
    await requireAuth();
    await requirePermission(Resource.COMMUNICATION, Action.READ);

    const prisma = withTenant(tenantId);
    
    const calls = await prisma.callLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: calls };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
