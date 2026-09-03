import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import prisma from '@db/utils/prisma';

describe('Diagnostic S4.2: System Bypass RLS Leak', () => {
  it('should not leak bypass_rls to normal prisma client', async () => {
    const tenantId = crypto.randomUUID();
    const customerId = crypto.randomUUID();

    // 1. Setup Data using System Prisma
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantId}', 'Diag Tenant', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Customer" (id, "tenantId", name, "normalizedName", "createdAt", "updatedAt") VALUES ('${customerId}', '${tenantId}', 'Diag Customer', 'diag customer', now(), now())`);
    });

    console.log("Data Seeded.");

    // 2. Query Data with unprivileged prisma
    const before = await prisma.customer.findMany({ where: { id: customerId } });
    console.log(`Before System Bypass: Found ${before.length} customers (Expected 0 due to RLS)`);

    // 3. Trigger Bypass
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      const inside = await tx.customer.findMany({ where: { id: customerId } });
      console.log(`Inside System Bypass: Found ${inside.length} customers (Expected 1)`);
      
      const pids: any[] = await tx.$queryRawUnsafe(`SELECT pg_backend_pid() as pid, current_setting('app.bypass_rls', true) as bypass`);
      console.log(`Inside System Bypass PID: ${pids[0].pid}, bypass: ${pids[0].bypass}`);
    });

    // 4. Query Data again with unprivileged prisma
    const after = await prisma.customer.findMany({ where: { id: customerId } });
    console.log(`After System Bypass: Found ${after.length} customers (Expected 0)`);
    
    const pids2: any[] = await prisma.$queryRawUnsafe(`SELECT pg_backend_pid() as pid, current_setting('app.bypass_rls', true) as bypass`);
    console.log(`Unprivileged Prisma PID: ${pids2[0].pid}, bypass: ${pids2[0].bypass}`);

    // Cleanup
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      await tx.$executeRawUnsafe(`DELETE FROM "Customer" WHERE id = '${customerId}'`);
      await tx.$executeRawUnsafe(`DELETE FROM "Tenant" WHERE id = '${tenantId}'`);
    });
    
    expect(after.length).toBe(0);
  });
});
