import { withTenant } from '@db/utils/prisma-tenant';
import { redis } from '@/lib/cache/redis.client';

export async function getTenantConfig(tenantId: string) {
  if (redis) {
    const cached = await redis.get(`tenant:${tenantId}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
