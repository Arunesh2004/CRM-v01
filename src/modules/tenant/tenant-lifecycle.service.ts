import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import prisma from '@db/utils/prisma';
import { requireAuth } from '@/lib/auth';
import { invalidateTenantCache } from '@/modules/tenant/tenant.service';

export async function requestTenantDeletion(tenantId: string, reason: string) {
  const user = await requireAuth();

  const tenant = await withTenant(tenantId).tenant.findUnique({
    where: { id: tenantId }
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  if (tenant.ownerId !== user.id) {
    throw new Error('Forbidden: Only the Tenant Owner can request deletion');
  }



  const updatedTenant = await withTenant(tenantId).tenant.update({
    where: { id: tenantId },
    data: {
      status: 'DELETION_REQUESTED',
      deletedAt: new Date(),
      deletedById: user.id,
      deletionReason: reason,
    }
  });

  await withTenant(tenantId).auditLog.create({
    data: {
      tenantId: tenant.id,
      actorId: user.id,
      actorType: 'USER',
      action: 'TENANT_DELETION_REQUESTED',
      resource: 'SYSTEM',
      resourceId: tenant.id,
      metadata: { reason }
    }
  });

  await invalidateTenantCache(tenantId);

  return updatedTenant;
}
