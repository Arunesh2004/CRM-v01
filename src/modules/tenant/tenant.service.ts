import { withTenant } from '@db/utils/prisma-tenant';
import { Tenant } from '@prisma/client';
import { redis } from '@/lib/cache/redis.client';

export async function getTenantConfig(tenantId: string) {
  if (redis) {
    const cached = await redis.get(`tenant:${tenantId}`);
    if (cached) return (typeof cached === 'string' ? JSON.parse(cached) : cached) as Tenant;
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
