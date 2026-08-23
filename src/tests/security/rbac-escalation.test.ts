import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { checkPermissionFast, requirePermissionFast } from '../../lib/auth';
import prisma from '../../../database/utils/prisma';
import * as crypto from 'crypto';

describe('RBAC Privilege Escalation Security Tests', () => {
  const tenantId = crypto.randomUUID();
  const employeeUserId = crypto.randomUUID();
  const roleId = crypto.randomUUID();

  beforeAll(async () => {
    // Provision fixtures securely
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantId}', 'Tenant A', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, "tenantId", email, status, "createdAt", "updatedAt") 
        VALUES ('${employeeUserId}', '${tenantId}', 'employee@test.com', 'ACTIVE', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Role" (id, "tenantId", name, "createdAt", "updatedAt")
        VALUES ('${roleId}', '${tenantId}', 'Employee', now(), now())`);
      await tx.$executeRawUnsafe(`-- Assign Role to User
        INSERT INTO "UserRole" (id, "userId", "roleId", "tenantId", "createdAt")
        VALUES ('${crypto.randomUUID()}', '${employeeUserId}', '${roleId}', '${tenantId}', now())`);

      // We need to use Prisma to create the RolePermission since it handles the permission relation
      // Actually, since this is testing `checkPermissionFast` which caches in Redis, we need real data.
      let perm = await tx.permission.findFirst({ where: { resource: 'CUSTOMER', action: 'READ' } });
      if (!perm) perm = await tx.permission.create({ data: { resource: 'CUSTOMER', action: 'READ' } });
      const permIdToUse = perm.id;

      await tx.$executeRawUnsafe(`
        INSERT INTO "RolePermission" (id, "roleId", "permissionId", "tenantId", "createdAt")
        VALUES ('${crypto.randomUUID()}', '${roleId}', '${permIdToUse}', '${tenantId}', now());
      `);
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // Cannot delete tenant because of FK
    });
  });

  it('allows an employee to perform CUSTOMER:READ', async () => {
    // Assert actual allowed behavior
    const hasPerm = await checkPermissionFast(employeeUserId, 'CUSTOMER', 'READ');
    expect(hasPerm).toBe(true);
  });

  it('blocks an employee from performing SYSTEM:UPDATE', async () => {
    // Attack: Employee attempts Admin action
    const hasPerm = await checkPermissionFast(employeeUserId, 'SYSTEM', 'UPDATE');
    expect(hasPerm).toBe(false);

    // Using requirePermissionFast should throw
    await expect(
      requirePermissionFast(employeeUserId, 'SYSTEM', 'UPDATE')
    ).rejects.toThrow(/Forbidden/);
  });
});
