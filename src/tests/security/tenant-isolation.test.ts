import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { withTenant, withTenantTransaction } from '../../../database/utils/prisma-tenant';
import * as crypto from 'crypto';

describe('Tenant Isolation Security Tests (Real DB)', () => {
  const tenantAId = crypto.randomUUID();
  const tenantBId = crypto.randomUUID();
  const customerBId = crypto.randomUUID();

  beforeAll(async () => {
    // 1. Provision fixtures securely using SYSTEM context
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantAId}', 'Tenant A', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantBId}', 'Tenant B', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Customer" (id, "tenantId", name, "normalizedName", "createdAt", "updatedAt") 
        VALUES ('${customerBId}', '${tenantBId}', 'Customer B', 'customer b', now(), now())`);
    });
  });

  afterAll(async () => {
    // Cleanup securely
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`DELETE FROM "Customer" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      await tx.$executeRawUnsafe(`DELETE FROM "Tenant" WHERE id IN ('${tenantAId}', '${tenantBId}')`);
    });
  });

  it('blocks Tenant A from reading Tenant B data', async () => {
    // Attack: Tenant A attempts to read Customer B
    const tenantAPrisma = withTenant(tenantAId);
    
    // RLS should return null/empty when reading another tenant's data
    const customer = await tenantAPrisma.customer.findUnique({
      where: { id: customerBId }
    });
    
    expect(customer).toBeNull();
  });

  it('blocks Tenant A from updating Tenant B data', async () => {
    // Attack: Tenant A attempts to update Customer B
    const tenantAPrisma = withTenant(tenantAId);
    
    await expect(
      tenantAPrisma.customer.update({
        where: { id: customerBId },
        data: { name: 'Hacked' }
      })
    ).rejects.toThrow();
  });

  it('normalizes mass assignment of tenantId to current tenant', async () => {
    const tenantAPrisma = withTenant(tenantAId);
    
    // Tenant A attempts to create a record in Tenant B
    const customer = await tenantAPrisma.customer.create({
      data: {
        id: crypto.randomUUID(),
        tenantId: tenantBId, // Malicious injection
        name: 'Hacker Customer',
        normalizedName: 'hacker customer'
      }
    });

    // The middleware normalizes it to tenantAId
    expect(customer.tenantId).toBe(tenantAId);
  });
});
