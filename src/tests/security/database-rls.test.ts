import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { withTenantTransaction } from '../../../database/utils/prisma-tenant';

const prisma = new PrismaClient(); // App Connection (crm_app)

describe('PostgreSQL Row Level Security - Pre-Migration Baseline', () => {
  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userB: any;

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      tenantA = await tx.tenant.create({
        data: { name: 'RLS-Test-Tenant-A-' + Date.now() }
      });
      tenantB = await tx.tenant.create({
        data: { name: 'RLS-Test-Tenant-B-' + Date.now() }
      });
      
      userA = await tx.user.create({
        data: {
          email: 'usera@testA' + Date.now() + '.com',
          firstName: 'User',
          lastName: 'A',
          tenantId: tenantA.id,
          clerkId: 'test_clerk_' + Date.now() + '_A'
        }
      });
      
      userB = await tx.user.create({
        data: {
          email: 'userb@testB' + Date.now() + '.com',
          firstName: 'User',
          lastName: 'B',
          tenantId: tenantB.id,
          clerkId: 'test_clerk_' + Date.now() + '_B'
        }
      });
      
      // Create some initial records
      await tx.customer.create({
        data: {
          name: 'Customer A',
          normalizedName: 'customer a',
          tenantId: tenantA.id
        }
      });
      await tx.customer.create({
        data: {
          name: 'Customer B',
          normalizedName: 'customer b',
          tenantId: tenantB.id
        }
      });
    });
  });

  afterAll(async () => {
    if (tenantA || tenantB) {
      await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        if (tenantA) {
          await tx.customer.deleteMany({ where: { tenantId: tenantA.id } });
          await tx.role.deleteMany({ where: { tenantId: tenantA.id } });
          await tx.user.deleteMany({ where: { tenantId: tenantA.id } });
          await tx.tenant.delete({ where: { id: tenantA.id } });
        }
        if (tenantB) {
          await tx.customer.deleteMany({ where: { tenantId: tenantB.id } });
          await tx.role.deleteMany({ where: { tenantId: tenantB.id } });
          await tx.user.deleteMany({ where: { tenantId: tenantB.id } });
          await tx.tenant.delete({ where: { id: tenantB.id } });
        }
      });
    }
    await prisma.$disconnect();
  });

  describe('3. BASE TENANT ISOLATION TESTS', () => {
    it('TEST A: No Context - Should block or allow depending on current state (Expected: Fail pre-RLS)', async () => {
      // Direct raw query without any context
      const customers = await prisma.$queryRaw<any[]>`SELECT * FROM "Customer" WHERE "tenantId" = ${tenantA.id}`;
      // After RLS, this must return 0 rows.
      expect(customers.length).toBe(0); 
    });

    it('TEST B & C: Context Scoped Access', async () => {
      await prisma.$transaction(async (baseTx) => {
        const txA = await withTenantTransaction(baseTx, tenantA.id);
        const customersA = await txA.$queryRaw<any[]>`SELECT * FROM "Customer" WHERE "tenantId" = ${tenantA.id}`;
        expect(customersA.length).toBe(1);

        const txB = await withTenantTransaction(baseTx, tenantB.id);
        const customersB = await txB.$queryRaw<any[]>`SELECT * FROM "Customer" WHERE "tenantId" = ${tenantB.id}`;
        expect(customersB.length).toBe(1);
      });
    });

    it('TEST D: Cross-Tenant SELECT (Expected: Fail pre-RLS)', async () => {
      await prisma.$transaction(async (baseTx) => {
        // Tenant A context
        const txA = await withTenantTransaction(baseTx, tenantA.id);
        // Tenant A tries to read Tenant B's data
        const customersB = await txA.$queryRaw<any[]>`SELECT * FROM "Customer" WHERE "tenantId" = ${tenantB.id}`;
        // After RLS, must be 0.
        expect(customersB.length).toBe(0);
      });
    });
  });

  describe('4. WRITE ATTACK TESTS', () => {
    it('TEST E: Cross-Tenant INSERT (Expected: Fail pre-RLS)', async () => {
      await prisma.$transaction(async (baseTx) => {
        const txA = await withTenantTransaction(baseTx, tenantA.id);
        // Tenant A tries to insert for Tenant B
        try {
            await txA.$executeRaw`INSERT INTO "Customer" (id, name, "normalizedName", "tenantId", "status", "updatedAt") VALUES (${'cust_' + Date.now()}, 'Test', 'test', ${tenantB.id}, 'ACTIVE', NOW())`;
            // Should not reach here
            expect(true).toBe(false);
        } catch (e: any) {
            expect(e.message).toContain('row-level security policy');
        }
      });
    });

    it('TEST F: Cross-Tenant UPDATE (Expected: Fail pre-RLS)', async () => {
      // Create a record for A
      let custA: any;
      await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        custA = await tx.customer.create({
          data: { name: 'Update Target', normalizedName: 'update target', tenantId: tenantA.id }
        });
      });

      await prisma.$transaction(async (baseTx) => {
        const txA = await withTenantTransaction(baseTx, tenantA.id);
        // Tenant A tries to change the tenantId to Tenant B
        try {
            await txA.$executeRaw`UPDATE "Customer" SET "tenantId" = ${tenantB.id} WHERE id = ${custA.id}`;
            expect(true).toBe(false); // should not execute
        } catch (e: any) {
            expect(e.message).toContain('row-level security policy');
        }
      });

      const check = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.customer.findUnique({ where: { id: custA.id } }));
      // RLS UPDATE WITH CHECK should block the update or silently fail
      expect(check?.tenantId).toBe(tenantA.id);
    });

    it('TEST G: Cross-Tenant DELETE (Expected: Fail pre-RLS)', async () => {
      await prisma.$transaction(async (baseTx) => {
        const txA = await withTenantTransaction(baseTx, tenantA.id);
        const result = await txA.$executeRaw`DELETE FROM "Customer" WHERE "tenantId" = ${tenantB.id}`;
        expect(result).toBe(0); // 0 rows affected
      });
    });
  });

  describe('5. RELATIONAL / JUNCTION ATTACKS', () => {
    // Phase 13.1B: UserRole and Role now have native PostgreSQL RLS.
    // This test verifies the database itself blocks the attack, not just app middleware.

    it('Relational FK Attack - UserRole: Tenant A cannot link to Tenant B Role via raw SQL', async () => {
      let roleB: any;
      await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        roleB = await tx.role.create({
          data: { name: 'CrossTenantRole-' + Date.now(), tenantId: tenantB.id }
        });
      });

      // Attack vector 1: Tenant A tenantId + Tenant B roleId
      // The FK references Role.id which belongs to tenantB — this should fail because
      // Role is now RLS-protected: Tenant A cannot read roleB from Role table,
      // and the UserRole insert itself would violate RLS (tenantId mismatch with roleId's tenant).
      await prisma.$transaction(async (baseTx) => {
        const txA = await withTenantTransaction(baseTx, tenantA.id);
        try {
          await txA.$executeRaw`INSERT INTO "UserRole" (id, "userId", "roleId", "tenantId", "createdAt") VALUES (${'ur_' + Date.now()}, ${userA.id}, ${roleB.id}, ${tenantA.id}, NOW())`;
          // PostgreSQL FK check: roleB.id is from tenantB; with RLS on Role, the FK
          // reference will fail because the role is invisible in tenantA's context,
          // OR the INSERT will be blocked by WITH CHECK on UserRole.
          // Either way, we must not reach here.
          expect(true).toBe(false);
        } catch (e: any) {
          // Must be blocked by RLS or FK violation
          expect(e.message).toMatch(/row-level security|constraint|foreign key|violates/i);
        }
      });

      // Verify roleB still exists (not altered)
      const stillExists = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
        tx.role.findUnique({ where: { id: roleB.id } })
      );
      expect(stillExists).not.toBeNull();
    });

    it('Relational FK Attack - UserRole: Tenant B tenantId + Tenant A userId (BOLA attempt)', async () => {
      // Attacker sets tenantB context but tries to link userA (belongs to tenantA)
      await prisma.$transaction(async (baseTx) => {
        const txB = await withTenantTransaction(baseTx, tenantB.id);
        try {
          // userA belongs to tenantA — FK on User will fail RLS or constraint
          await txB.$executeRaw`INSERT INTO "UserRole" (id, "userId", "roleId", "tenantId", "createdAt") VALUES (${'ur2_' + Date.now()}, ${userA.id}, ${userB.id}, ${tenantB.id}, NOW())`;
          expect(true).toBe(false);
        } catch (e: any) {
          // Must fail: either FK constraint on userId (userA not visible to tenantB via RLS on User)
          // or the roleId is invalid
          expect(e.message).toMatch(/row-level security|constraint|foreign key|violates/i);
        }
      });
    });

    it('Relational FK Attack - Role cross-tenant SELECT: Tenant A cannot read Tenant B roles', async () => {
      let roleB: any;
      await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        roleB = await tx.role.create({
          data: { name: 'SecretRoleB-' + Date.now(), tenantId: tenantB.id }
        });
      });

      // With RLS on Role, tenantA context cannot see tenantB's roles
      const found = await prisma.$transaction(async (baseTx) => {
        const txA = await withTenantTransaction(baseTx, tenantA.id);
        return txA.$queryRaw<any[]>`SELECT * FROM "Role" WHERE id = ${roleB.id}`;
      });
      expect(found.length).toBe(0);
    });

    it('Relational FK Attack - Role cross-tenant INSERT: Tenant A cannot create Role for Tenant B', async () => {
      await prisma.$transaction(async (baseTx) => {
        const txA = await withTenantTransaction(baseTx, tenantA.id);
        try {
          await txA.$executeRaw`INSERT INTO "Role" (id, "tenantId", name, "createdAt", "updatedAt") VALUES (${'role_' + Date.now()}, ${tenantB.id}, 'EvilRole', NOW(), NOW())`;
          expect(true).toBe(false);
        } catch (e: any) {
          expect(e.message).toContain('row-level security');
        }
      });
    });

    it('Relational FK Attack - UserRole cross-tenant DELETE: Tenant A cannot delete Tenant B UserRoles', async () => {
      let roleB: any;
      let urB: any;
      await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        roleB = await tx.role.create({
          data: { name: 'RoleB-del-' + Date.now(), tenantId: tenantB.id }
        });
        urB = await tx.userRole.create({
          data: { userId: userB.id, roleId: roleB.id, tenantId: tenantB.id }
        });
      });

      // Tenant A attempts to delete Tenant B's UserRole
      await prisma.$transaction(async (baseTx) => {
        const txA = await withTenantTransaction(baseTx, tenantA.id);
        const deleted = await txA.$executeRaw`DELETE FROM "UserRole" WHERE id = ${urB.id}`;
        expect(deleted).toBe(0); // RLS blocks it, 0 rows deleted
      });

      // Verify it still exists
      const stillExists = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
        tx.userRole.findUnique({ where: { id: urB.id } })
      );
      expect(stillExists).not.toBeNull();
    });

    it('Relational FK Attack - RolePermission: Tenant A cannot read Tenant B RolePermissions', async () => {
      let roleB: any;
      let permId: any;
      await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        roleB = await tx.role.create({
          data: { name: 'RolePerm-B-' + Date.now(), tenantId: tenantB.id }
        });
        // Get an existing permission to reference
        const perm = await tx.permission.findFirst();
        if (perm) {
          permId = perm.id;
          await tx.rolePermission.create({
            data: { roleId: roleB.id, permissionId: perm.id, tenantId: tenantB.id }
          });
        }
      });

      if (!permId) return; // Skip if no permissions seeded

      // Tenant A must not see Tenant B's RolePermissions
      const found = await prisma.$transaction(async (baseTx) => {
        const txA = await withTenantTransaction(baseTx, tenantA.id);
        return txA.$queryRaw<any[]>`SELECT * FROM "RolePermission" WHERE "tenantId" = ${tenantB.id}`;
      });
      expect(found.length).toBe(0);
    });
  });

  describe('7. SYSTEM BYPASS TEST', () => {
    it('executeAsSystem handles cross-tenant reads properly', async () => {
      await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        const allCustomers = await tx.$queryRaw<any[]>`SELECT * FROM "Customer" WHERE "tenantId" IN (${tenantA.id}, ${tenantB.id})`;
        expect(allCustomers.length).toBeGreaterThan(1);
      });
    });

    it('executeAsSystem can read Roles from any tenant', async () => {
      let roleA: any;
      let roleB: any;
      await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        roleA = await tx.role.create({ data: { name: 'SysRoleA-' + Date.now(), tenantId: tenantA.id } });
        roleB = await tx.role.create({ data: { name: 'SysRoleB-' + Date.now(), tenantId: tenantB.id } });
      });

      await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        const roles = await tx.$queryRaw<any[]>`SELECT * FROM "Role" WHERE id IN (${roleA.id}, ${roleB.id})`;
        expect(roles.length).toBe(2);
      });
    });
  });

  describe('8. CONNECTION POOL / SESSION LEAK TEST', () => {
    it('Transactions do not leak tenant context', async () => {
      await prisma.$transaction(async (baseTx) => {
        const txA = await withTenantTransaction(baseTx, tenantA.id);
        await txA.$queryRaw`SELECT 1`;
      });
      
      // Separate transaction without explicit tenant context
      await prisma.$transaction(async (tx) => {
        const res = await tx.$queryRaw<any[]>`SELECT current_setting('app.current_tenant_id', true)`;
        expect(res[0].current_setting === '' || res[0].current_setting === null).toBe(true);
      });
    });
  });

  describe('9. FORGED TENANT CONTEXT TEST', () => {
    it('Directly setting app.current_tenant_id allows access to that tenant', async () => {
      await prisma.$transaction(async (tx) => {
         await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', '${tenantB.id}', true)`);
         const customersB = await tx.$queryRaw<any[]>`SELECT * FROM "Customer"`;
         // Without RLS, it currently returns everything. With RLS, it would return Tenant B data.
         expect(customersB.length).toBeGreaterThan(0);
      });
    });
  });
});
