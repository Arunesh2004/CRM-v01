import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import prisma from '@db/utils/prisma';
import { withTenant } from '@db/utils/prisma-tenant';
import crypto from 'crypto';

// Use a direct client for setup/teardown to ensure it works outside connection pool interference,
// or we can just use executeAsSystem for seeding.
const adminPrisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@127.0.0.1:5435/crm_migration_safety_test"
    }
  }
});

describe('PHASE S4.2B: System Bypass RLS Non-Superuser Environment Validation', () => {
  let tenantAId: string;
  let tenantBId: string;
  let customerAId: string;
  let customerBId: string;

  beforeAll(async () => {
    // We use the admin client (postgres) purely to seed the test data reliably, avoiding RLS issues during setup.
    tenantAId = crypto.randomUUID();
    tenantBId = crypto.randomUUID();
    customerAId = crypto.randomUUID();
    customerBId = crypto.randomUUID();

    await adminPrisma.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantAId}', 'Tenant A', now(), now())`);
    await adminPrisma.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantBId}', 'Tenant B', now(), now())`);

    await adminPrisma.$executeRawUnsafe(`INSERT INTO "Customer" (id, "tenantId", name, "normalizedName", "createdAt", "updatedAt") VALUES ('${customerAId}', '${tenantAId}', 'Customer A', 'customer_a', now(), now())`);
    await adminPrisma.$executeRawUnsafe(`INSERT INTO "Customer" (id, "tenantId", name, "normalizedName", "createdAt", "updatedAt") VALUES ('${customerBId}', '${tenantBId}', 'Customer B', 'customer_b', now(), now())`);
  });

  afterAll(async () => {
    await adminPrisma.$executeRawUnsafe(`DELETE FROM "Customer" WHERE id IN ('${customerAId}', '${customerBId}')`);
    await adminPrisma.$executeRawUnsafe(`DELETE FROM "Tenant" WHERE id IN ('${tenantAId}', '${tenantBId}')`);
    await adminPrisma.$disconnect();
  });

  it('Part 3 - Scenario A: Normal application query with NO tenant context returns 0 rows (RLS active)', async () => {
    const customers = await prisma.customer.findMany({ where: { id: { in: [customerAId, customerBId] } } });
    expect(customers.length).toBe(0);
  });

  it('Part 3 - Scenario B & C: Tenant context sees only its own records', async () => {
    const clientA = withTenant(tenantAId);
    const customersA = await clientA.customer.findMany({ where: { id: { in: [customerAId, customerBId] } } });
    expect(customersA.length).toBe(1);
    expect(customersA[0].id).toBe(customerAId);

    const clientB = withTenant(tenantBId);
    const customersB = await clientB.customer.findMany({ where: { id: { in: [customerAId, customerBId] } } });
    expect(customersB.length).toBe(1);
    expect(customersB[0].id).toBe(customerBId);
  });

  it('Part 4 & 5 - Verify System Bypass and Transaction Cleanup', async () => {
    let capturedPid = '';
    
    // 1. Verify system bypass
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      const customers = await tx.customer.findMany({ where: { id: { in: [customerAId, customerBId] } } });
      expect(customers.length).toBe(2);
      
      const pids: any[] = await tx.$queryRawUnsafe(`SELECT pg_backend_pid() as pid, current_setting('app.bypass_rls', true) as bypass`);
      capturedPid = pids[0].pid;
      expect(pids[0].bypass).toBe('on');
    });

    // 2. Verify normal query cleanup
    const pids2: any[] = await prisma.$queryRawUnsafe(`SELECT pg_backend_pid() as pid, current_setting('app.bypass_rls', true) as bypass`);
    // Note: It might or might not be the same PID, but regardless it should be cleaned up.
    expect(pids2[0].bypass).toBeNull();

    const customersAfter = await prisma.customer.findMany({ where: { id: { in: [customerAId, customerBId] } } });
    expect(customersAfter.length).toBe(0);
  });

  it('Part 6 - Connection Pool Reuse Stress Test', async () => {
    const pidsChecked = new Set<string>();
    
    const runs = Array.from({ length: 100 }, (_, i) => i);
    
    for (const i of runs) {
      if (i % 2 === 0) {
        // System Request
        await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
          const customers = await tx.customer.findMany({ where: { id: { in: [customerAId, customerBId] } } });
          expect(customers.length).toBe(2);
        });
      } else {
        // Normal Request
        const pids: any[] = await prisma.$queryRawUnsafe(`SELECT pg_backend_pid() as pid, current_setting('app.bypass_rls', true) as bypass`);
        const pid = pids[0].pid;
        pidsChecked.add(String(pid));
        
        expect(pids[0].bypass).toBeNull();
        const customers = await prisma.customer.findMany({ where: { id: { in: [customerAId, customerBId] } } });
        expect(customers.length).toBe(0);
      }
    }
    
    // We expect some pool reuse, so multiple queries should hit the same connection
    console.log(`Pool reuse check: unique PIDs utilized: ${pidsChecked.size}`);
  });

  it('Part 7 - Rollback Test Cleanup Verification', async () => {
    try {
      await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        const pids: any[] = await tx.$queryRawUnsafe(`SELECT pg_backend_pid() as pid, current_setting('app.bypass_rls', true) as bypass`);
        expect(pids[0].bypass).toBe('on');
        
        const customers = await tx.customer.findMany({ where: { id: { in: [customerAId, customerBId] } } });
        expect(customers.length).toBe(2);
        
        throw new Error('Intentional Rollback');
      });
    } catch (e: any) {
      expect(e.message).toBe('Intentional Rollback');
    }

    // Verify cleanup
    const pids2: any[] = await prisma.$queryRawUnsafe(`SELECT pg_backend_pid() as pid, current_setting('app.bypass_rls', true) as bypass`);
    expect(pids2[0].bypass).toBeNull();

    const customersAfter = await prisma.customer.findMany({ where: { id: { in: [customerAId, customerBId] } } });
    expect(customersAfter.length).toBe(0);
  });
});
