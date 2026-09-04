import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { withTenant } from '@db/utils/prisma-tenant';
import { randomUUID } from 'crypto';
import prisma from '@db/utils/prisma';

describe('Phase 6R: TenantBootstrap RLS Security (Stage 7)', () => {
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const unprivilegedUserA = randomUUID();

  beforeAll(async () => {
    // Bootstrap two separate tenants as system
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx: any) => {
      // Create tenants
      await tx.tenant.create({ data: { id: tenantA, name: 'Tenant A' } });
      await tx.tenant.create({ data: { id: tenantB, name: 'Tenant B' } });

      // Create users
      await tx.user.create({
        data: {
          id: unprivilegedUserA,
          email: `attacker_${unprivilegedUserA}@tenantA.com`,
          firstName: 'Attacker',
          lastName: 'A',
          tenantId: tenantA,
          employeeId: `EMP-${unprivilegedUserA.substring(0, 5)}`,
          status: 'ACTIVE',
        },
      });

      // Create initial bootstrap records
      await tx.tenantBootstrap.create({ data: { tenantId: tenantA } });
      await tx.tenantBootstrap.create({ data: { tenantId: tenantB } });
    });
  });

  afterAll(async () => {
    // Cleanup
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx: any) => {
      await tx.tenantBootstrap.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await tx.user.deleteMany({ where: { id: unprivilegedUserA } });
      await tx.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    });
  });

  it('TEST A: Tenant A SELECTs its own TenantBootstrap - EXPECT ALLOW', async () => {
    const prismaTenantA = withTenant(tenantA);
    const result = await prismaTenantA.tenantBootstrap.findUnique({
      where: { tenantId: tenantA },
    });
    expect(result).toBeDefined();
    expect(result?.tenantId).toBe(tenantA);
  });

  it('TEST B: Tenant A SELECTs Tenant B TenantBootstrap - EXPECT DENY / ZERO ROWS', async () => {
    // We use queryRawUnsafe inside a transaction with tenantA set, to bypass Prisma's middleware rewriting the where clause.
    // This proves the DATABASE RLS policy directly blocks it.
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
      return tx.$queryRawUnsafe<any[]>(
        `SELECT * FROM "TenantBootstrap" WHERE "tenantId" = $1;`,
        tenantB
      );
    });
    // RLS should hide the row, effectively resulting in 0 rows returned
    expect(result.length).toBe(0);
  });

  it('TEST C: Tenant A attempts INSERT with tenantId = Tenant B - EXPECT DENY', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
        return tx.$queryRawUnsafe(
          `INSERT INTO "TenantBootstrap" ("tenantId") VALUES ($1);`,
          tenantB
        );
      })
    ).rejects.toThrow();
  });

  it('TEST D: Tenant A attempts UPDATE of Tenant B TenantBootstrap - EXPECT DENY', async () => {
    // Attempting to update another tenant's row should affect 0 rows because RLS hides it.
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
      // Using execute to get affected rows count, update returns 0 if blocked by USING, or throws if WITH CHECK fails (but WITH CHECK applies to new rows)
      return tx.$executeRawUnsafe(
        `UPDATE "TenantBootstrap" SET "bootstrappedAt" = NOW() WHERE "tenantId" = $1;`,
        tenantB
      );
    });
    expect(result).toBe(0);
  });

  it('TEST E: Tenant A attempts DELETE of Tenant B TenantBootstrap - EXPECT DENY', async () => {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
      return tx.$executeRawUnsafe(
        `DELETE FROM "TenantBootstrap" WHERE "tenantId" = $1;`,
        tenantB
      );
    });
    expect(result).toBe(0);
  });

  it('TEST F: Tenant A attempts to enumerate all TenantBootstrap rows - EXPECT Only Tenant A row is visible', async () => {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
      return tx.$queryRawUnsafe<any[]>(`SELECT * FROM "TenantBootstrap";`);
    });
    
    expect(result.length).toBeGreaterThan(0);
    result.forEach((row: any) => {
      expect(row.tenantId).toBe(tenantA);
    });
  });

  it('TEST G: Tenant A attempts to manipulate its own row - EXPECT Application behavior (ALLOW/DENY depending on route)', async () => {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
      return tx.$executeRawUnsafe(
        `UPDATE "TenantBootstrap" SET "bootstrappedAt" = NOW() WHERE "tenantId" = $1;`,
        tenantA
      );
    });
    // RLS allows updating own row (1 row affected)
    expect(result).toBe(1);
  });

  it('TEST H: Trusted system operation accesses multiple tenants - EXPECT ALLOW through executeAsSystem', async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx: any) => {
      const allRows = await tx.tenantBootstrap.findMany({
        where: { tenantId: { in: [tenantA, tenantB] } }
      });
      expect(allRows.length).toBe(2);
      const tenantIds = allRows.map((r: any) => r.tenantId);
      expect(tenantIds).toContain(tenantA);
      expect(tenantIds).toContain(tenantB);
    });
  });

  it('TEST I: Verify FORCE RLS directly via pg_class', async () => {
    const result = await prisma.$queryRawUnsafe<any[]>(`
      SELECT relrowsecurity, relforcerowsecurity 
      FROM pg_class 
      WHERE relname = 'TenantBootstrap';
    `);
    expect(result.length).toBe(1);
    expect(result[0].relrowsecurity).toBe(true);
    expect(result[0].relforcerowsecurity).toBe(true);
  });

  it('TEST J: Verify policy definitions directly via pg_policies', async () => {
    const result = await prisma.$queryRawUnsafe<any[]>(`
      SELECT policyname, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'TenantBootstrap';
    `);
    expect(result.length).toBeGreaterThan(0);
    
    // Ensure the policy uses the standard convention
    const policy = result[0];
    const qualString = policy.qual.toString();
    expect(qualString).toContain('app.current_tenant_id');
    expect(qualString).toContain('app.bypass_rls');
  });
});
