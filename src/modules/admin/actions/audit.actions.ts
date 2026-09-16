'use server';
import { withServerActionContext } from '@/lib/observability/server-action';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';
import { Resource, Action } from '@prisma/client';

async function _getAuditLogsAction() {
  try {
    const tenantId = await requireTenant();
    await requireAuth();
    await requirePermission(Resource.SYSTEM, Action.UPDATE);

    const prisma = withTenant(tenantId);
    
    const logs = await prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    const userActorIds = Array.from(new Set(logs.filter(l => l.actorType === 'USER').map(l => l.actorId)));
    const users = await prisma.user.findMany({
      where: { id: { in: userActorIds } },
      select: { id: true, email: true }
    });
    const userMap = new Map(users.map(u => [u.id, u.email]));

    const data = logs.map(log => ({
      ...log,
      actorUser: log.actorType === 'USER' ? { email: userMap.get(log.actorId) || null } : null
    }));

    return { success: true, data };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getAuditLogsAction = withServerActionContext(_getAuditLogsAction);
