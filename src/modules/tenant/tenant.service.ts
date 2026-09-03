import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import prisma from '@db/utils/prisma';
import { redis } from '@/lib/cache/redis.client';

export async function getTenantConfig(tenantId: string) {
  if (redis) {
    const cached = await redis.get(`tenant:${tenantId}`);
    if (cached) return cached as any;
  }

  const tenant = await withTenant(tenantId).tenant.findUnique({
    where: { id: tenantId }
  });

  if (redis && tenant) {
    await redis.set(`tenant:${tenantId}`, JSON.stringify(tenant), { ex: 3600 });
  }

  return tenant;
}

export async function invalidateTenantCache(tenantId: string) {
  if (redis) {
    await redis.del(`tenant:${tenantId}`);
  }
}
