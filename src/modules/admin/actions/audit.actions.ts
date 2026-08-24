'use server';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';
import { Resource, Action } from '@prisma/client';

export async function getAuditLogsAction() {
  try {
    const tenantId = await requireTenant();
    await requireAuth();
    await requirePermission(Resource.SYSTEM, Action.MANAGE_TERRITORIES);

    const prisma = withTenant(tenantId);
    
    const logs = await prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    return { success: true, data: logs };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
