import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../../database/utils/prisma';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { withTenant, withTenantTransaction } from '../../../database/utils/prisma-tenant';

describe('UserInvitation RLS Verification', () => {
  let tenantA: string;
  let tenantB: string;
  let roleA: string;
  let roleB: string;
  let inviteA: string;
  let inviteB: string;

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // Create Tenants
      const tA = await tx.tenant.create({ data: { name: 'Tenant A' } });
      tenantA = tA.id;
      const tB = await tx.tenant.create({ data: { name: 'Tenant B' } });
      tenantB = tB.id;

      // Create Roles
      const rA = await tx.role.create({ data: { tenantId: tenantA, name: 'Admin A' } });
      roleA = rA.id;
      const rB = await tx.role.create({ data: { tenantId: tenantB, name: 'Admin B' } });
      roleB = rB.id;

      const uidA = crypto.randomUUID();
      const uidB = crypto.randomUUID();

      // Create Invitations
      const iA = await tx.userInvitation.create({
        data: {
          tenantId: tenantA,
          email: `${uidA}@example.com`,
          roleId: roleA,
          tokenHash: `hashA_${uidA}`,
          expiresAt: new Date(Date.now() + 86400000),
          status: 'PENDING'
        }
      });
      inviteA = iA.id;

      const iB = await tx.userInvitation.create({
        data: {
          tenantId: tenantB,
          email: `${uidB}@example.com`,
          roleId: roleB,
          tokenHash: `hashB_${uidB}`,
          expiresAt: new Date(Date.now() + 86400000),
          status: 'PENDING'
        }
      });
      inviteB = iB.id;
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.userInvitation.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await tx.role.deleteMany({ where: { id: { in: [roleA, roleB] } } });
      // We don't delete tenants to avoid cascades, or just leave them as tests do
    });
  });

  it('Tenant A -> SELECT Invitation A -> ALLOW', async () => {
    const tenantPrisma = withTenant(tenantA);
    const result = await tenantPrisma.userInvitation.findUnique({ where: { id: inviteA } });
    expect(result).not.toBeNull();
  });

  it('Tenant A -> SELECT Invitation B -> DENY / Invisible', async () => {
    const tenantPrisma = withTenant(tenantA);
    const result = await tenantPrisma.userInvitation.findUnique({ where: { id: inviteB } });
    expect(result).toBeNull();
  });

  it('Tenant A -> UPDATE Invitation A -> ALLOW', async () => {
    const tenantPrisma = withTenant(tenantA);
    const result = await tenantPrisma.userInvitation.update({
      where: { id: inviteA },
      data: { status: 'REVOKED' }
    });
    expect(result.status).toBe('REVOKED');
  });

  it('Tenant A -> UPDATE Invitation B -> DENY', async () => {
    const tenantPrisma = withTenant(tenantA);
    await expect(tenantPrisma.userInvitation.update({
      where: { id: inviteB },
      data: { status: 'REVOKED' }
    })).rejects.toThrow(); // Should throw RecordNotFound or RLS denial
  });

  it('Tenant A -> DELETE Invitation A -> ALLOW', async () => {
    const tenantPrisma = withTenant(tenantA);
    const delUid = crypto.randomUUID();
    // recreate A to delete it
    const iA = await executeAsSystem(SystemOperation.SECURITY_AUDIT, (tx) => tx.userInvitation.create({
      data: {
        tenantId: tenantA,
        email: `${delUid}@example.com`,
        roleId: roleA,
        tokenHash: `delHashA_${delUid}`,
        expiresAt: new Date(Date.now() + 86400000),
        status: 'PENDING'
      }
    }));
    
    await expect(tenantPrisma.userInvitation.delete({ where: { id: iA.id } })).resolves.toBeDefined();
  });

  it('Tenant A -> DELETE Invitation B -> DENY', async () => {
    const tenantPrisma = withTenant(tenantA);
    await expect(tenantPrisma.userInvitation.delete({ where: { id: inviteB } })).rejects.toThrow();
  });

  it('Tenant A -> INSERT Invitation with tenantId A -> ALLOW', async () => {
    const tenantPrisma = withTenant(tenantA);
    const newUid = crypto.randomUUID();
    const result = await tenantPrisma.userInvitation.create({
      data: {
        tenantId: tenantA,
        email: `${newUid}@example.com`,
        roleId: roleA,
        tokenHash: `newHashA_${newUid}`,
        expiresAt: new Date(Date.now() + 86400000),
        status: 'PENDING'
      }
    });
    expect(result.id).toBeDefined();
  });

  it('Tenant A -> INSERT Invitation with tenantId B -> DENY', async () => {
    // withTenant automatically forces tenantId to tenantA on create, but we can bypass with executeRaw 
    // to test strict DB-level enforcement.
    const hackUid = crypto.randomUUID();
    await expect(
      prisma.$transaction(async (tx) => {
        await withTenantTransaction(tx, tenantA);
        // Direct insertion using tenantB
        return tx.$executeRawUnsafe(`
          INSERT INTO "UserInvitation" ("id", "tenantId", "email", "roleId", "tokenHash", "expiresAt", "status", "updatedAt")
          VALUES ('test_id_1', '${tenantB}', '${hackUid}@example.com', '${roleB}', 'hack1_${hackUid}', NOW(), 'PENDING', NOW())
        `);
      })
    ).rejects.toThrow(); // new row violates row-level security policy
  });

  it('Tenant A -> UPDATE Invitation A SET tenantId = B -> DENY', async () => {
    // Attempting to move invitation A to tenant B
    await expect(
      prisma.$transaction(async (tx) => {
        await withTenantTransaction(tx, tenantA);
        return tx.$executeRawUnsafe(`
          UPDATE "UserInvitation" SET "tenantId" = '${tenantB}' WHERE id = '${inviteA}'
        `);
      })
    ).rejects.toThrow(); // new row violates row-level security policy for WITH CHECK
  });

  it('Tenant A -> INSERT Invitation with Tenant A but Role B -> DENY', async () => {
    const hack2Uid = crypto.randomUUID();
    await expect(
      prisma.$transaction(async (tx) => {
        await withTenantTransaction(tx, tenantA);
        // tenantId is correct, but roleId belongs to B
        return tx.$executeRawUnsafe(`
          INSERT INTO "UserInvitation" ("id", "tenantId", "email", "roleId", "tokenHash", "expiresAt", "status", "updatedAt")
          VALUES ('test_id2', '${tenantA}', '${hack2Uid}@example.com', '${roleB}', 'hack2_${hack2Uid}', NOW(), 'PENDING', NOW())
        `);
      })
    ).rejects.toThrow(); // new row violates row-level security policy for WITH CHECK
  });
});
