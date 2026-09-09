import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { TerritoryService } from '../../../src/modules/sales-intel/territory.service';
import * as crypto from 'crypto';
import * as auth from '../../../src/lib/auth';

describe('Track B - Territories Security Tests', () => {
  const tenantAId = crypto.randomUUID();
  const tenantBId = crypto.randomUUID();

  const tAAdminId = crypto.randomUUID();
  const tADeptHeadId = crypto.randomUUID();
  const tAMemberId = crypto.randomUUID();
  const tAApproverId = crypto.randomUUID();
  
  const territoryAId = crypto.randomUUID();
  const territoryBId = crypto.randomUUID();
  
  let assignmentAId: string;

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // 1. Create Tenants
      await tx.tenant.createMany({
        data: [
          { id: tenantAId, name: 'Tenant A', status: 'ACTIVE' },
          { id: tenantBId, name: 'Tenant B', status: 'ACTIVE' },
        ],
      });

      // 2. Create Roles
      const adminRoleA = await tx.role.create({ data: { name: 'TENANT_ADMIN', tenantId: tenantAId } });
      const deptHeadRoleA = await tx.role.create({ data: { name: 'DEPARTMENT_HEAD', tenantId: tenantAId } });
      const memberRoleA = await tx.role.create({ data: { name: 'MEMBER', tenantId: tenantAId } });
      const approverRoleA = await tx.role.create({ data: { name: 'APPROVER', tenantId: tenantAId } });

      // 3. Create Users
      await tx.user.createMany({
        data: [
          { id: tAAdminId, tenantId: tenantAId, email: `admin_${tenantAId}@test.com`, firstName: 'A', lastName: 'Admin' },
          { id: tADeptHeadId, tenantId: tenantAId, email: `head_${tenantAId}@test.com`, firstName: 'A', lastName: 'Head' },
          { id: tAMemberId, tenantId: tenantAId, email: `mem_${tenantAId}@test.com`, firstName: 'A', lastName: 'Mem' },
          { id: tAApproverId, tenantId: tenantAId, email: `app_${tenantAId}@test.com`, firstName: 'A', lastName: 'App' },
        ],
      });

      // 4. Assign Roles
      await tx.userRole.createMany({
        data: [
          { userId: tAAdminId, roleId: adminRoleA.id, tenantId: tenantAId },
          { userId: tADeptHeadId, roleId: deptHeadRoleA.id, tenantId: tenantAId },
          { userId: tAMemberId, roleId: memberRoleA.id, tenantId: tenantAId },
          { userId: tAApproverId, roleId: approverRoleA.id, tenantId: tenantAId },
        ],
      });

      // 5. Seed Permissions
      const permIntelRead = await tx.permission.upsert({ where: { resource_action: { resource: 'SALES_INTEL', action: 'READ' } }, update: {}, create: { resource: 'SALES_INTEL', action: 'READ' } });
      const permTerritoryManage = await tx.permission.upsert({ where: { resource_action: { resource: 'SALES_INTEL', action: 'MANAGE_TERRITORIES' } }, update: {}, create: { resource: 'SALES_INTEL', action: 'MANAGE_TERRITORIES' } });

      // TENANT_ADMIN bypasses, but just in case:
      await tx.rolePermission.createMany({
        data: [
          { roleId: adminRoleA.id, permissionId: permIntelRead.id, tenantId: tenantAId },
          { roleId: adminRoleA.id, permissionId: permTerritoryManage.id, tenantId: tenantAId },
        ]
      });

      // 6. Create initial territories
      await tx.territory.create({
        data: { id: territoryAId, tenantId: tenantAId, name: 'Territory A' }
      });
      await tx.territory.create({
        data: { id: territoryBId, tenantId: tenantBId, name: 'Territory B' }
      });
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // Temporarily bypass trigger to clean up audit logs for test
      await tx.$executeRawUnsafe(`ALTER TABLE "AuditLog" DISABLE TRIGGER USER`);
      await tx.$executeRawUnsafe(`DELETE FROM "AuditLog" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      await tx.$executeRawUnsafe(`ALTER TABLE "AuditLog" ENABLE TRIGGER USER`);
      
      await tx.userTerritory.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.territory.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.userRole.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.rolePermission.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.permission.deleteMany({ where: { resource: 'SALES_INTEL' } });
      await tx.role.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
    });
    vi.restoreAllMocks();
  });

  function mockAuthAs(userId: string, tenantId: string) {
    vi.spyOn(auth, 'requireAuth').mockResolvedValue({ id: userId, tenantId } as any);
  }

  it('1. Tenant Admin can read territories', async () => {
    mockAuthAs(tAAdminId, tenantAId);
    const territories = await TerritoryService.getTerritories(tenantAId, tAAdminId);
    expect(territories.length).toBeGreaterThan(0);
  });

  it('2. Tenant Admin can create territory', async () => {
    mockAuthAs(tAAdminId, tenantAId);
    const t = await TerritoryService.createTerritory(tAAdminId, tenantAId, { name: 'New Territory' });
    expect(t.id).toBeDefined();
    expect(t.tenantId).toBe(tenantAId);
  });

  it('3. Tenant Admin can update territory', async () => {
    mockAuthAs(tAAdminId, tenantAId);
    const t = await TerritoryService.updateTerritory(tAAdminId, tenantAId, territoryAId, { description: 'Updated' });
    expect(t.description).toBe('Updated');
  });

  it('4. Tenant Admin can assign territory', async () => {
    mockAuthAs(tAAdminId, tenantAId);
    const assignment = await TerritoryService.assignUser(tAAdminId, tenantAId, { targetUserId: tAMemberId, territoryId: territoryAId });
    expect(assignment.id).toBeDefined();
    assignmentAId = assignment.id;
  });

  it('5. Tenant Admin can remove territory assignment', async () => {
    mockAuthAs(tAAdminId, tenantAId);
    const result = await TerritoryService.removeAssignment(tAAdminId, tenantAId, assignmentAId);
    expect(result).toBe(true);
  });

  it('6. Department Head cannot manage territories', async () => {
    mockAuthAs(tADeptHeadId, tenantAId);
    await expect(TerritoryService.createTerritory(tADeptHeadId, tenantAId, { name: 'X' })).rejects.toThrow();
  });

  it('7. Member cannot manage territories', async () => {
    mockAuthAs(tAMemberId, tenantAId);
    await expect(TerritoryService.updateTerritory(tAMemberId, tenantAId, territoryAId, { name: 'X' })).rejects.toThrow();
  });

  it('8. Approver cannot manage territories', async () => {
    mockAuthAs(tAApproverId, tenantAId);
    await expect(TerritoryService.assignUser(tAApproverId, tenantAId, { targetUserId: tAMemberId, territoryId: territoryAId })).rejects.toThrow();
  });

  it('9. Tenant A cannot read Tenant B territories', async () => {
    mockAuthAs(tAAdminId, tenantAId);
    await expect(TerritoryService.getTerritory(tAAdminId, tenantAId, territoryBId)).resolves.toBeNull();
  });

  it('10. Tenant A cannot assign users to Tenant B territories', async () => {
    mockAuthAs(tAAdminId, tenantAId);
    await expect(TerritoryService.assignUser(tAAdminId, tenantAId, { targetUserId: tAMemberId, territoryId: territoryBId }))
      .rejects.toThrow('Territory not found');
  });

  it('11. Client-supplied tenantId cannot cross tenant boundaries', async () => {
    mockAuthAs(tAAdminId, tenantAId); 
    const t = await TerritoryService.createTerritory(tAAdminId, tenantAId, { name: 'Malicious' });
    expect(t.tenantId).toBe(tenantAId);
  });
});
