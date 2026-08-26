import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import prisma from '@db/utils/prisma';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { inviteEmployee } from '@/modules/users/user.service';
import { ensureUserProvisioned } from '@/modules/auth/services/provisioning.service';
import * as authLib from '@/lib/auth';

// Mock clerkClient to prevent real network calls
vi.mock('@clerk/nextjs/server', () => {
  return {
    clerkClient: () => Promise.resolve({
      invitations: {
        createInvitation: vi.fn().mockResolvedValue({ id: 'inv_mock_123', status: 'pending' })
      }
    }),
    auth: vi.fn()
  };
});

describe('Onboarding Lifecycle & Security Invariants', () => {
  let tenant1Id: string;
  let tenant2Id: string;
  let t1AdminId: string;
  let t1DeptHeadId: string;
  let t1DeptId: string;
  
  beforeAll(async () => {
    // Bootstrap test data
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      const t1 = await tx.tenant.create({ data: { name: 'Test Tenant 1', status: 'ACTIVE' } });
      const t2 = await tx.tenant.create({ data: { name: 'Test Tenant 2', status: 'ACTIVE' } });
      tenant1Id = t1.id;
      tenant2Id = t2.id;
      
      const adminRole = await tx.role.create({ data: { name: 'TENANT_ADMIN', tenantId: t1.id } });
      const deptHeadRole = await tx.role.create({ data: { name: 'DEPARTMENT_HEAD', tenantId: t1.id } });
      const memberRole = await tx.role.create({ data: { name: 'MEMBER', tenantId: t1.id } });
      
      // Seed roles for tenant 2
      await tx.role.create({ data: { name: 'TENANT_ADMIN', tenantId: t2.id } });
      await tx.role.create({ data: { name: 'MEMBER', tenantId: t2.id } });

      const dept = await tx.department.create({ data: { name: 'Engineering', tenantId: t1.id } });
      t1DeptId = dept.id;

      // Admin user
      const admin = await tx.user.create({
        data: {
          email: 'admin@t1.com',
          clerkId: 'c_admin_1',
          tenantId: t1.id,
          status: 'ACTIVE',
          userRoles: { create: { roleId: adminRole.id, tenantId: t1.id } }
        }
      });
      t1AdminId = admin.id;

      // Dept Head user
      const deptHead = await tx.user.create({
        data: {
          email: 'dh@t1.com',
          clerkId: 'c_dh_1',
          tenantId: t1.id,
          departmentId: dept.id,
          status: 'ACTIVE',
          userRoles: { create: { roleId: deptHeadRole.id, tenantId: t1.id } }
        }
      });
      t1DeptHeadId = deptHead.id;
      
      // Setup permission mock for simplicity
      const perm = await tx.permission.upsert({
        where: { resource_action: { resource: 'USER', action: 'CREATE' } },
        update: {},
        create: { resource: 'USER', action: 'CREATE' }
      });
      await tx.rolePermission.create({ data: { roleId: adminRole.id, permissionId: perm.id, tenantId: t1.id } });
      await tx.rolePermission.create({ data: { roleId: deptHeadRole.id, permissionId: perm.id, tenantId: t1.id } });
    });
  });

  afterAll(async () => {
    // Teardown skipped because AuditLog append-only Postgres trigger prevents Tenant deletion.
    // The test DB isolates tests by creating a unique tenant per test suite.
  });

  it('CASE A & B: Admin invites employee, matching Clerk registration links account', async () => {
    const uniqueSuffix = Date.now().toString();
    // Mock requireAuth to return Admin
    const mockAdmin = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.user.findUnique({ where: { id: t1AdminId }, include: { userRoles: { include: { role: true } } } }));
    vi.spyOn(authLib, 'requireAuth').mockResolvedValue(mockAdmin as any);
    vi.spyOn(authLib, 'requireTenant').mockResolvedValue(tenant1Id);
    vi.spyOn(authLib, 'requirePermission').mockResolvedValue(undefined as any);
    
    const email = `newemp_${uniqueSuffix}@t1.com`;
    await inviteEmployee(email, 'MEMBER');
    
    // Check local user is INVITED
    const invitedUser = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.user.findFirst({ where: { email } })
    );
    expect(invitedUser).toBeDefined();
    expect(invitedUser?.status).toBe('INVITED');
    expect(invitedUser?.clerkId).toBeNull();
    
    // Simulate Clerk user.created
    const webhookPayload = {
      id: 'c_newemp_1',
      email_addresses: [{ email_address: email }]
    };
    
    const linkedUser = await ensureUserProvisioned(webhookPayload);
    expect(linkedUser).toBeDefined();
    expect(linkedUser?.clerkId).toBe('c_newemp_1');
    expect(linkedUser?.status).toBe('ACTIVE');
    
    // Verify DB
    const activeUser = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.user.findFirst({ where: { email } })
    );
    expect(activeUser?.status).toBe('ACTIVE');
    expect(activeUser?.tenantId).toBe(tenant1Id);
  });

  it('CASE C: Unknown Clerk User yields no CRM account', async () => {
    const uniqueSuffix = Date.now().toString();
    const webhookPayload = {
      id: `c_unknown_${uniqueSuffix}`,
      email_addresses: [{ email_address: `rando_${uniqueSuffix}@hacker.com` }]
    };
    
    const linkedUser = await ensureUserProvisioned(webhookPayload);
    expect(linkedUser).toBeNull();
    
    const dbUser = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.user.findFirst({ where: { email: `rando_${uniqueSuffix}@hacker.com` } })
    );
    expect(dbUser).toBeNull();
  });

  it('CASE E: Role Forgery (Dept Head cannot invite TENANT_ADMIN)', async () => {
    const uniqueSuffix = Date.now().toString();
    const mockDH = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.user.findUnique({ where: { id: t1DeptHeadId }, include: { userRoles: { include: { role: true } } } }));
    vi.spyOn(authLib, 'requireAuth').mockResolvedValue(mockDH as any);
    vi.spyOn(authLib, 'requireTenant').mockResolvedValue(tenant1Id);
    
    await expect(inviteEmployee(`admin2_${uniqueSuffix}@t1.com`, 'TENANT_ADMIN', t1DeptId))
      .rejects.toThrow('Forbidden: Only a TENANT_ADMIN can assign or invite the TENANT_ADMIN role.');
  });

  it('CASE G: Department Forgery (Dept Head cannot invite to another department)', async () => {
    const uniqueSuffix = Date.now().toString();
    const mockDH = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.user.findUnique({ where: { id: t1DeptHeadId }, include: { userRoles: { include: { role: true } } } }));
    vi.spyOn(authLib, 'requireAuth').mockResolvedValue(mockDH as any);
    vi.spyOn(authLib, 'requireTenant').mockResolvedValue(tenant1Id);
    
    // Try to invite to a non-existent/different department
    await expect(inviteEmployee(`otherdept_${uniqueSuffix}@t1.com`, 'MEMBER', 'some-other-dept-id'))
      .rejects.toThrow('Forbidden: You cannot manage employees outside your department.');
  });

  it('CASE H: Duplicate Webhook is Idempotent', async () => {
    const uniqueSuffix = Date.now().toString();
    const email = `dupwebhook_${uniqueSuffix}@t1.com`;
    const mockAdmin = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.user.findUnique({ where: { id: t1AdminId }, include: { userRoles: { include: { role: true } } } }));
    vi.spyOn(authLib, 'requireAuth').mockResolvedValue(mockAdmin as any);
    vi.spyOn(authLib, 'requireTenant').mockResolvedValue(tenant1Id);
    
    await inviteEmployee(email, 'MEMBER');
    
    const webhookPayload = {
      id: `c_dup_${uniqueSuffix}`,
      email_addresses: [{ email_address: email }]
    };
    
    const res1 = await ensureUserProvisioned(webhookPayload);
    expect(res1?.status).toBe('ACTIVE');
    
    // Second webhook identical
    const res2 = await ensureUserProvisioned(webhookPayload);
    expect(res2?.status).toBe('ACTIVE');
    
    // Total users with this email is 1
    const count = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.user.count({ where: { email } })
    );
    expect(count).toBe(1);
  });
  
  it('CASE D: Email Mismatch yields no link', async () => {
    const uniqueSuffix = Date.now().toString();
    const email = `correct_${uniqueSuffix}@t1.com`;
    const mockAdmin = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.user.findUnique({ where: { id: t1AdminId }, include: { userRoles: { include: { role: true } } } }));
    vi.spyOn(authLib, 'requireAuth').mockResolvedValue(mockAdmin as any);
    vi.spyOn(authLib, 'requireTenant').mockResolvedValue(tenant1Id);
    
    await inviteEmployee(email, 'MEMBER');
    
    const webhookPayload = {
      id: `c_wrong_${uniqueSuffix}`,
      email_addresses: [{ email_address: `wrong_${uniqueSuffix}@t1.com` }]
    };
    
    const linkedUser = await ensureUserProvisioned(webhookPayload);
    expect(linkedUser).toBeNull();
    
    // correct email user is still INVITED
    const u = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.user.findFirst({ where: { email } })
    );
    expect(u?.status).toBe('INVITED');
    expect(u?.clerkId).toBeNull();
  });
});
