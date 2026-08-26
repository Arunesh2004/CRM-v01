import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { updateEmployeeRole } from '../../modules/users/user.service';
import { randomUUID as generateId } from 'crypto';
import * as auth from '@/lib/auth';

describe('Employee Role Editing Security', () => {
  let tenant1Id: string;
  let tenant2Id: string;
  
  let t1AdminId: string;
  let t1MemberId: string;
  let t1DeptHeadId: string;
  let t1TargetId: string;
  
  let t2TargetId: string;

  beforeAll(async () => {
    // 1. Create 2 isolated tenants
    tenant1Id = generateId();
    tenant2Id = generateId();

    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      await tx.tenant.createMany({
        data: [
          { id: tenant1Id, name: 'Role Test Tenant 1' },
          { id: tenant2Id, name: 'Role Test Tenant 2' }
        ]
      });

      // 2. Create roles for tenant 1
      const t1Roles = await tx.role.createManyAndReturn({
        data: [
          { tenantId: tenant1Id, name: 'TENANT_ADMIN' },
          { tenantId: tenant1Id, name: 'MEMBER' },
          { tenantId: tenant1Id, name: 'DEPARTMENT_HEAD' }
        ]
      });
      
      // Create roles for tenant 2
      const t2Roles = await tx.role.createManyAndReturn({
        data: [
          { tenantId: tenant2Id, name: 'TENANT_ADMIN' },
          { tenantId: tenant2Id, name: 'MEMBER' }
        ]
      });

      // 3. Create users
      t1AdminId = generateId();
      t1MemberId = generateId();
      t1DeptHeadId = generateId();
      t1TargetId = generateId();
      t2TargetId = generateId();

      await tx.user.createMany({
        data: [
          { id: t1AdminId, tenantId: tenant1Id, email: `t1admin-${t1AdminId}@test.com`, clerkId: `clerk-${t1AdminId}` },
          { id: t1MemberId, tenantId: tenant1Id, email: `t1member-${t1MemberId}@test.com`, clerkId: `clerk-${t1MemberId}` },
          { id: t1DeptHeadId, tenantId: tenant1Id, email: `t1dh-${t1DeptHeadId}@test.com`, clerkId: `clerk-${t1DeptHeadId}` },
          { id: t1TargetId, tenantId: tenant1Id, email: `t1target-${t1TargetId}@test.com`, clerkId: `clerk-${t1TargetId}` },
          { id: t2TargetId, tenantId: tenant2Id, email: `t2target-${t2TargetId}@test.com`, clerkId: `clerk-${t2TargetId}` },
        ]
      });
      
      // Assign roles
      const r1Admin = t1Roles.find(r => r.name === 'TENANT_ADMIN')!;
      const r1Member = t1Roles.find(r => r.name === 'MEMBER')!;
      const r1Dh = t1Roles.find(r => r.name === 'DEPARTMENT_HEAD')!;
      
      await tx.userRole.createMany({
        data: [
          { tenantId: tenant1Id, userId: t1AdminId, roleId: r1Admin.id },
          { tenantId: tenant1Id, userId: t1MemberId, roleId: r1Member.id },
          { tenantId: tenant1Id, userId: t1DeptHeadId, roleId: r1Dh.id },
          { tenantId: tenant1Id, userId: t1TargetId, roleId: r1Member.id }
        ]
      });
    });
  });

  afterAll(async () => {
    // Cleanup - ignore foreign key/trigger errors for audit logs
    try {
      await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
        await tx.userRole.deleteMany({ where: { tenantId: { in: [tenant1Id, tenant2Id] } } });
        await tx.user.deleteMany({ where: { tenantId: { in: [tenant1Id, tenant2Id] } } });
        await tx.role.deleteMany({ where: { tenantId: { in: [tenant1Id, tenant2Id] } } });
        // AuditLog is append-only via Postgres trigger; deleting tenant fails. Just ignore cleanup errors in tests.
        // await tx.tenant.deleteMany({ where: { id: { in: [tenant1Id, tenant2Id] } } });
      });
    } catch (e) {
      console.warn('Cleanup skipped due to constraints:', e);
    }
  });

  it('A. TENANT_ADMIN → can change an employee role', async () => {
    // Mock Admin
    vi.spyOn(auth, 'requireAuth').mockResolvedValue({ id: t1AdminId, tenantId: tenant1Id, userRoles: [{ role: { name: 'TENANT_ADMIN' } }] } as any);
    vi.spyOn(auth, 'requireTenant').mockResolvedValue(tenant1Id);
    vi.spyOn(auth, 'requirePermission').mockResolvedValue(true as any);

    await expect(updateEmployeeRole(t1TargetId, 'DEPARTMENT_HEAD')).resolves.not.toThrow();
    
    // Verify changes
    const targetRoles = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.userRole.findMany({ where: { userId: t1TargetId }, include: { role: true } })
    );
    expect(targetRoles.length).toBe(1);
    expect(targetRoles[0].role.name).toBe('DEPARTMENT_HEAD');
  });

  it('B. MEMBER → cannot change an employee role', async () => {
    vi.spyOn(auth, 'requireAuth').mockResolvedValue({ id: t1MemberId, tenantId: tenant1Id, userRoles: [{ role: { name: 'MEMBER' } }] } as any);
    vi.spyOn(auth, 'requireTenant').mockResolvedValue(tenant1Id);
    vi.spyOn(auth, 'requirePermission').mockResolvedValue(true as any);

    await expect(updateEmployeeRole(t1TargetId, 'TENANT_ADMIN')).rejects.toThrow('Only TENANT_ADMIN can change roles.');
  });

  it('C. DEPARTMENT_HEAD → cannot bypass role-management restrictions', async () => {
    vi.spyOn(auth, 'requireAuth').mockResolvedValue({ id: t1DeptHeadId, tenantId: tenant1Id, userRoles: [{ role: { name: 'DEPARTMENT_HEAD' } }] } as any);
    vi.spyOn(auth, 'requireTenant').mockResolvedValue(tenant1Id);
    
    await expect(updateEmployeeRole(t1TargetId, 'TENANT_ADMIN')).rejects.toThrow('Only TENANT_ADMIN can change roles.');
  });

  it('D. Cross-tenant target → rejected', async () => {
    // Admin in Tenant 1 tries to change role of User in Tenant 2
    vi.spyOn(auth, 'requireAuth').mockResolvedValue({ id: t1AdminId, tenantId: tenant1Id, userRoles: [{ role: { name: 'TENANT_ADMIN' } }] } as any);
    vi.spyOn(auth, 'requireTenant').mockResolvedValue(tenant1Id);
    
    await expect(updateEmployeeRole(t2TargetId, 'TENANT_ADMIN')).rejects.toThrow('User not found in this tenant.');
  });

  it('E. Invalid role submitted manually → rejected', async () => {
    vi.spyOn(auth, 'requireAuth').mockResolvedValue({ id: t1AdminId, tenantId: tenant1Id, userRoles: [{ role: { name: 'TENANT_ADMIN' } }] } as any);
    vi.spyOn(auth, 'requireTenant').mockResolvedValue(tenant1Id);
    
    await expect(updateEmployeeRole(t1TargetId, 'HACKER_ROLE')).rejects.toThrow('Role HACKER_ROLE does not exist for this tenant.');
  });
});
