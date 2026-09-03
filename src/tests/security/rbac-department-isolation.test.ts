import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../../database/utils/prisma';
import crypto from 'crypto';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { disableEmployee } from '../../modules/users/user.service';
import * as authLib from '../../lib/auth';
import { vi } from 'vitest';

describe('Phase 3: Department Isolation & RBAC Adversarial Tests', () => {
  const tenantId = crypto.randomUUID();
  const deptHeadId = crypto.randomUUID();
  const targetEmployeeId = crypto.randomUUID();
  const otherDeptId = crypto.randomUUID();
  const ownDeptId = crypto.randomUUID();

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantId}', 'Test Tenant', now(), now())`);
      
      await tx.$executeRawUnsafe(`INSERT INTO "Department" (id, "tenantId", name, "createdAt", "updatedAt") VALUES ('${ownDeptId}', '${tenantId}', 'Dept A', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Department" (id, "tenantId", name, "createdAt", "updatedAt") VALUES ('${otherDeptId}', '${tenantId}', 'Dept B', now(), now())`);

      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, "tenantId", "departmentId", email, status, "createdAt", "updatedAt") VALUES ('${deptHeadId}', '${tenantId}', '${ownDeptId}', 'head@a.com', 'ACTIVE', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, "tenantId", "departmentId", email, status, "createdAt", "updatedAt") VALUES ('${targetEmployeeId}', '${tenantId}', '${otherDeptId}', 'emp@b.com', 'ACTIVE', now(), now())`);

      const roleId = crypto.randomUUID();
      await tx.$executeRawUnsafe(`INSERT INTO "Role" (id, "tenantId", name, "createdAt", "updatedAt") VALUES ('${roleId}', '${tenantId}', 'DEPARTMENT_HEAD', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "UserRole" (id, "userId", "roleId", "tenantId", "createdAt") VALUES ('${crypto.randomUUID()}', '${deptHeadId}', '${roleId}', '${tenantId}', now())`);
    });
  });

  afterAll(async () => {
    // cleanup omitted for brevity
  });

  it('A. DEPARTMENT_HEAD Dept A -> disable Employee Dept B (DENIED)', async () => {
    vi.spyOn(authLib, 'requireAuth').mockResolvedValue({
      id: deptHeadId, tenantId, departmentId: ownDeptId, userRoles: [{ role: { name: 'DEPARTMENT_HEAD' } }]
    } as any);
    vi.spyOn(authLib, 'requireTenant').mockResolvedValue(tenantId);
    vi.spyOn(authLib, 'requirePermission').mockResolvedValue(true as any);

    await expect(disableEmployee(targetEmployeeId)).rejects.toThrow('Forbidden: You cannot manage employees outside your department.');
  });

  it('B. DEPARTMENT_HEAD Dept A -> disable TENANT_ADMIN (DENIED)', async () => {
    // Setup a Tenant Admin
    const adminId = crypto.randomUUID();
    const adminRoleId = crypto.randomUUID();
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, "tenantId", email, status, "createdAt", "updatedAt") VALUES ('${adminId}', '${tenantId}', 'admin@tenant.com', 'ACTIVE', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Role" (id, "tenantId", name, "createdAt", "updatedAt") VALUES ('${adminRoleId}', '${tenantId}', 'TENANT_ADMIN', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "UserRole" (id, "userId", "roleId", "tenantId", "createdAt") VALUES ('${crypto.randomUUID()}', '${adminId}', '${adminRoleId}', '${tenantId}', now())`);
    });

    vi.spyOn(authLib, 'requireAuth').mockResolvedValue({
      id: deptHeadId, tenantId, departmentId: ownDeptId, userRoles: [{ role: { name: 'DEPARTMENT_HEAD' } }]
    } as any);

    await expect(disableEmployee(adminId)).rejects.toThrow('Forbidden: Cannot disable a user with equal or higher privileges.');
  });

  it('C. DEPARTMENT_HEAD Dept A -> disable another DEPARTMENT_HEAD (DENIED)', async () => {
    // Setup another Dept Head in the same department
    const otherHeadId = crypto.randomUUID();
    const headRoleId = crypto.randomUUID();
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, "tenantId", "departmentId", email, status, "createdAt", "updatedAt") VALUES ('${otherHeadId}', '${tenantId}', '${ownDeptId}', 'otherhead@a.com', 'ACTIVE', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Role" (id, "tenantId", name, "createdAt", "updatedAt") VALUES ('${headRoleId}', '${tenantId}', 'DEPARTMENT_HEAD', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "UserRole" (id, "userId", "roleId", "tenantId", "createdAt") VALUES ('${crypto.randomUUID()}', '${otherHeadId}', '${headRoleId}', '${tenantId}', now())`);
    });

    vi.spyOn(authLib, 'requireAuth').mockResolvedValue({
      id: deptHeadId, tenantId, departmentId: ownDeptId, userRoles: [{ role: { name: 'DEPARTMENT_HEAD' } }]
    } as any);

    await expect(disableEmployee(otherHeadId)).rejects.toThrow('Forbidden: Cannot disable a user with equal or higher privileges.');
  });

  it('D. DEPARTMENT_HEAD with no department -> disable employee (DENIED)', async () => {
    vi.spyOn(authLib, 'requireAuth').mockResolvedValue({
      id: deptHeadId, tenantId, departmentId: null, userRoles: [{ role: { name: 'DEPARTMENT_HEAD' } }] // No dept
    } as any);

    await expect(disableEmployee(targetEmployeeId)).rejects.toThrow('Forbidden: You do not belong to a department to manage.');
  });

  it('E. DEPARTMENT_HEAD Dept A -> disable Employee Dept A (ALLOWED)', async () => {
    // Setup employee in own dept
    const ownEmployeeId = crypto.randomUUID();
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, "tenantId", "departmentId", email, status, "createdAt", "updatedAt") VALUES ('${ownEmployeeId}', '${tenantId}', '${ownDeptId}', 'ownemp@a.com', 'ACTIVE', now(), now())`);
    });

    vi.spyOn(authLib, 'requireAuth').mockResolvedValue({
      id: deptHeadId, tenantId, departmentId: ownDeptId, userRoles: [{ role: { name: 'DEPARTMENT_HEAD' } }]
    } as any);

    // Mock Clerk to avoid external call in test
    vi.mock('@clerk/nextjs/server', () => ({
      clerkClient: () => ({ users: { deleteUser: vi.fn() } })
    }));

    await expect(disableEmployee(ownEmployeeId)).resolves.toEqual({ success: true });
  });

  it('F. TENANT_ADMIN -> disable Employee Dept A (ALLOWED)', async () => {
    const ownEmployeeId = crypto.randomUUID();
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, "tenantId", "departmentId", email, status, "createdAt", "updatedAt") VALUES ('${ownEmployeeId}', '${tenantId}', '${ownDeptId}', 'ownemp2@a.com', 'ACTIVE', now(), now())`);
    });

    vi.spyOn(authLib, 'requireAuth').mockResolvedValue({
      id: crypto.randomUUID(), tenantId, departmentId: null, userRoles: [{ role: { name: 'TENANT_ADMIN' } }]
    } as any);

    await expect(disableEmployee(ownEmployeeId)).resolves.toEqual({ success: true });
  });

  it('G. Tenant A actor -> target Tenant B user (DENIED / invisible)', async () => {
    const tenantBId = crypto.randomUUID();
    const userBId = crypto.randomUUID();
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantBId}', 'Tenant B', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, "tenantId", email, status, "createdAt", "updatedAt") VALUES ('${userBId}', '${tenantBId}', 'userb@b.com', 'ACTIVE', now(), now())`);
    });

    vi.spyOn(authLib, 'requireAuth').mockResolvedValue({
      id: crypto.randomUUID(), tenantId, departmentId: null, userRoles: [{ role: { name: 'TENANT_ADMIN' } }]
    } as any);

    await expect(disableEmployee(userBId)).rejects.toThrow('User not found in this tenant.');
  });
});
