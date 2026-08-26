import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@db/utils/prisma';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { withTenantTransaction } from '@db/utils/prisma-tenant';

describe('Application Layer - Concurrency & Context Leak Test', () => {
  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userB: any;

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      tenantA = await tx.tenant.create({ data: { name: 'Concurrency Tenant A', status: 'ACTIVE' } });
      tenantB = await tx.tenant.create({ data: { name: 'Concurrency Tenant B', status: 'ACTIVE' } });

      userA = await tx.user.create({ data: { email: 'userA@concurrency-a.com', firstName: 'User', lastName: 'A', clerkId: 'clerk_concurrency_a', tenantId: tenantA.id, status: 'ACTIVE' } });
      userB = await tx.user.create({ data: { email: 'userB@concurrency-b.com', firstName: 'User', lastName: 'B', clerkId: 'clerk_concurrency_b', tenantId: tenantB.id, status: 'ACTIVE' } });
    });
  });

  afterAll(async () => {
    if (tenantA || tenantB) {
      await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        if (tenantA) {
          await tx.user.deleteMany({ where: { tenantId: tenantA.id } });
          await tx.tenant.delete({ where: { id: tenantA.id } });
        }
        if (tenantB) {
          await tx.user.deleteMany({ where: { tenantId: tenantB.id } });
          await tx.tenant.delete({ where: { id: tenantB.id } });
        }
      });
    }
  });

  it('Ensures rapid concurrent transactions do not leak app.current_tenant_id across pooled connections', async () => {
    // We fire 100 concurrent requests across overlapping Tenants and System contexts
    // to aggressively detect if Connection Pooling persists context across releases.
    const iterations = Array.from({ length: 100 }, (_, i) => i);

    const promises = iterations.map(async (i) => {
      if (i % 3 === 0) {
        // Tenant A request
        return await prisma.$transaction(async (baseTx) => {
          const tx = await withTenantTransaction(baseTx, tenantA.id);
          const users = await tx.user.findMany();
          // Assert isolated boundary
          users.forEach(u => expect(u.tenantId).toBe(tenantA.id));
        });
      } else if (i % 3 === 1) {
        // Tenant B request
        return await prisma.$transaction(async (baseTx) => {
          const tx = await withTenantTransaction(baseTx, tenantB.id);
          const users = await tx.user.findMany();
          // Assert isolated boundary
          users.forEach(u => expect(u.tenantId).toBe(tenantB.id));
        });
      } else {
        // System request
        return await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
          const users = await tx.user.findMany({ where: { clerkId: { in: ['clerk_concurrency_a', 'clerk_concurrency_b'] } } });
          // System boundary should see both tenants
          expect(users.length).toBe(2);
        });
      }
    });

    // Execute concurrently. Any leakage will result in an assertion failure.
    await Promise.all(promises);
  });
});
