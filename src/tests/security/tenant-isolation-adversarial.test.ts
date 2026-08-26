import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import prisma from '@db/utils/prisma';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { disableEmployee, reassignDepartment, getEmployees } from '@/modules/users/user.service';
import * as authLib from '@/lib/auth';

describe('Tenant Isolation Adversarial Testing (Phase 7)', () => {
  let tenant1Id: string;
  let tenant2Id: string;
  let t1AdminId: string;
  let t2AdminId: string;
  let t1DeptId: string;
  let t2DeptId: string;
  let t2EmployeeId: string;
  
  beforeAll(async () => {
    // Bootstrap test data
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      const t1 = await tx.tenant.create({ data: { name: 'Adversarial Tenant 1', status: 'ACTIVE' } });
      const t2 = await tx.tenant.create({ data: { name: 'Adversarial Tenant 2', status: 'ACTIVE' } });
      tenant1Id = t1.id;
      tenant2Id = t2.id;
      
      const adminRole1 = await tx.role.create({ data: { name: 'TENANT_ADMIN', tenantId: t1.id } });
      const adminRole2 = await tx.role.create({ data: { name: 'TENANT_ADMIN', tenantId: t2.id } });
      const memberRole2 = await tx.role.create({ data: { name: 'MEMBER', tenantId: t2.id } });

      const dept1 = await tx.department.create({ data: { name: 'Engineering T1', tenantId: t1.id } });
      const dept2 = await tx.department.create({ data: { name: 'Engineering T2', tenantId: t2.id } });
      t1DeptId = dept1.id;
      t2DeptId = dept2.id;

      // T1 Admin
      const admin1 = await tx.user.create({
        data: {
          email: 'admin1@adv.com',
          clerkId: 'c_adv1_1',
          tenantId: t1.id,
          status: 'ACTIVE',
          userRoles: { create: { roleId: adminRole1.id, tenantId: t1.id } }
        }
      });
      t1AdminId = admin1.id;

      // T2 Admin
      const admin2 = await tx.user.create({
        data: {
          email: 'admin2@adv.com',
          clerkId: 'c_adv2_1',
          tenantId: t2.id,
          status: 'ACTIVE',
          userRoles: { create: { roleId: adminRole2.id, tenantId: t2.id } }
        }
      });
      t2AdminId = admin2.id;

      // T2 Employee (Target for attacks)
      const emp2 = await tx.user.create({
        data: {
          email: 'emp2@adv.com',
          clerkId: 'c_emp2_1',
          tenantId: t2.id,
          departmentId: dept2.id,
          status: 'ACTIVE',
          userRoles: { create: { roleId: memberRole2.id, tenantId: t2.id } }
        }
      });
      t2EmployeeId = emp2.id;
      
      // Setup permission mock for simplicity
      const permUpdate = await tx.permission.upsert({
        where: { resource_action: { resource: 'USER', action: 'UPDATE' } },
        update: {},
        create: { resource: 'USER', action: 'UPDATE' }
      });
      const permDelete = await tx.permission.upsert({
        where: { resource_action: { resource: 'USER', action: 'DELETE' } },
        update: {},
        create: { resource: 'USER', action: 'DELETE' }
      });
      const permRead = await tx.permission.upsert({
        where: { resource_action: { resource: 'USER', action: 'READ' } },
        update: {},
        create: { resource: 'USER', action: 'READ' }
      });
      await tx.rolePermission.create({ data: { roleId: adminRole1.id, permissionId: permUpdate.id, tenantId: t1.id } });
      await tx.rolePermission.create({ data: { roleId: adminRole1.id, permissionId: permDelete.id, tenantId: t1.id } });
      await tx.rolePermission.create({ data: { roleId: adminRole1.id, permissionId: permRead.id, tenantId: t1.id } });
    });
  });

  afterAll(async () => {
    // Teardown skipped because AuditLog append-only Postgres trigger prevents Tenant deletion.
    // The test DB isolates tests by creating a unique tenant per test suite.
  });

  it('Tenant A user requesting Tenant B employee via getEmployees yields nothing', async () => {
    const mockAdmin1 = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.user.findUnique({ where: { id: t1AdminId }, include: { userRoles: { include: { role: true } } } }));
    vi.spyOn(authLib, 'requireAuth').mockResolvedValue(mockAdmin1 as any);
    vi.spyOn(authLib, 'requireTenant').mockResolvedValue(tenant1Id);
    vi.spyOn(authLib, 'requirePermission').mockResolvedValue(undefined as any);
    
    // T1 Admin searches for T2 employee by email
    const employees = await getEmployees({ search: 'emp2@adv.com' });
    expect(employees.length).toBe(0); // T1 Admin should not see T2 Employee
  });

  it('Tenant A user modifying Tenant B employee (reassigning department) fails safely', async () => {
    const mockAdmin1 = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.user.findUnique({ where: { id: t1AdminId }, include: { userRoles: { include: { role: true } } } }));
    vi.spyOn(authLib, 'requireAuth').mockResolvedValue(mockAdmin1 as any);
    vi.spyOn(authLib, 'requireTenant').mockResolvedValue(tenant1Id);
    
    // Attempting to reassign T2 Employee to T1 Department
    await expect(reassignDepartment(t2EmployeeId, t1DeptId))
      .rejects.toThrow('User not found in this tenant.');
  });

  it('Tenant A user modifying Tenant B employee (disabling) fails safely', async () => {
    const mockAdmin1 = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.user.findUnique({ where: { id: t1AdminId }, include: { userRoles: { include: { role: true } } } }));
    vi.spyOn(authLib, 'requireAuth').mockResolvedValue(mockAdmin1 as any);
    vi.spyOn(authLib, 'requireTenant').mockResolvedValue(tenant1Id);
    
    // Attempting to disable T2 Employee
    await expect(disableEmployee(t2EmployeeId))
      .rejects.toThrow('User not found in this tenant.');
  });
});
