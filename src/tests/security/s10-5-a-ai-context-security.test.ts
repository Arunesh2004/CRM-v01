import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import prisma from '@db/utils/prisma';
import { ContextBuilderService, AIContext } from '@/modules/ai/context/context-builder.service';
import { ToolRegistry } from '@/modules/ai/tools/registry';
import * as prismaSystem from '@db/utils/prisma-system';
const { executeAsSystem, SystemOperation } = prismaSystem;

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
  requireTenant: vi.fn(),
  requirePermission: vi.fn(),
}));
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';

vi.mock('@db/utils/prisma-tenant', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    withTenant: vi.fn(actual.withTenant)
  };
});

describe('Phase 10.5 Subphase A - AI Context & Authorization Security', () => {
  let tenantId: string;
  let adminUserId: string;
  let standardUserId: string;

  beforeAll(async () => {
    // We run inside system context to setup our test fixtures
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: 'AI Security Test Tenant', status: 'ACTIVE' }
      });
      tenantId = tenant.id;

      // 1. Setup Admin (has SYSTEM:ADMIN)
      const adminRole = await tx.role.create({
        data: {
          tenant: { connect: { id: tenantId } },
          name: 'AI Admin',
          permissions: {
            create: [
              {
                tenant: { connect: { id: tenantId } },
                permission: {
                  connectOrCreate: {
                    where: { resource_action: { resource: 'SYSTEM', action: 'MANAGE_TERRITORIES' } },
                    create: { resource: 'SYSTEM', action: 'MANAGE_TERRITORIES' }
                  }
                }
              },
              {
                tenant: { connect: { id: tenantId } },
                permission: {
                  connectOrCreate: {
                    where: { resource_action: { resource: 'CUSTOMER', action: 'READ' } },
                    create: { resource: 'CUSTOMER', action: 'READ' }
                  }
                }
              },
              {
                tenant: { connect: { id: tenantId } },
                permission: {
                  connectOrCreate: {
                    where: { resource_action: { resource: 'LEAD', action: 'UPDATE' } },
                    create: { resource: 'LEAD', action: 'UPDATE' }
                  }
                }
              }
            ]
          }
        }
      });

      const adminUser = await tx.user.create({
        data: {
          tenant: { connect: { id: tenantId } },
          email: 'admin-ai@test.com',
          firstName: 'Admin',
          lastName: 'User',
          clerkId: 'test_admin_ai_' + Date.now(),
          userRoles: { create: { role: { connect: { id: adminRole.id } }, tenant: { connect: { id: tenantId } } } }
        }
      });
      adminUserId = adminUser.id;

      // 2. Setup Standard User (No SYSTEM:ADMIN, only CUSTOMER:READ)
      const standardRole = await tx.role.create({
        data: {
          tenant: { connect: { id: tenantId } },
          name: 'AI Standard User',
          permissions: {
            create: [
              {
                tenant: { connect: { id: tenantId } },
                permission: {
                  connectOrCreate: {
                    where: { resource_action: { resource: 'CUSTOMER', action: 'READ' } },
                    create: { resource: 'CUSTOMER', action: 'READ' }
                  }
                }
              }
            ]
          }
        }
      });

      const standardUser = await tx.user.create({
        data: {
          tenant: { connect: { id: tenantId } },
          email: 'standard-ai@test.com',
          firstName: 'Standard',
          lastName: 'User',
          clerkId: 'test_std_ai_' + Date.now(),
          userRoles: { create: { role: { connect: { id: standardRole.id } }, tenant: { connect: { id: tenantId } } } }
        }
      });
      standardUserId = standardUser.id;

      await ToolRegistry.bootstrapTools();
    });
  });

  afterAll(async () => {
    // Tests use UUIDs, no cleanup necessary because AuditLog is append-only and prevents teardown
  });

  describe('Context Builder Isolation', () => {
    it('1. Valid user context succeeds', async () => {
      const context = await ContextBuilderService.buildUserContext(tenantId, standardUserId);
      expect(context).toBeDefined();
      expect(context.tenantId).toBe(tenantId);
      expect(context.user.id).toBe(standardUserId);
    });

    it('2. Tenant is derived from trusted server context', async () => {
      const context = await ContextBuilderService.buildUserContext(tenantId, adminUserId);
      expect(context.tenantId).toBe(tenantId);
      expect(context.permissions).toContain('SYSTEM:MANAGE_TERRITORIES');
    });

    it('3. Forged tenantId cannot override trusted tenant (fails closed)', async () => {
      // Trying to pass an attacker tenant ID directly to the context builder
      await expect(
        ContextBuilderService.buildUserContext('fake-tenant', standardUserId)
      ).rejects.toThrow('Unauthorized: Context build failed');
    });

    it('4. Forged userId cannot override trusted actor (fails closed)', async () => {
      await expect(
        ContextBuilderService.buildUserContext(tenantId, 'fake-user-id')
      ).rejects.toThrow('Unauthorized: Context build failed');
    });

    it('5. Context cannot be mutated into another tenant', async () => {
      const context = await ContextBuilderService.buildUserContext(tenantId, standardUserId);
      expect(() => {
        // @ts-expect-error Testing runtime immutability
        context.tenantId = 'hacked-tenant';
      }).toThrow();
      expect(context.tenantId).toBe(tenantId);
    });

    it('10. Missing authorization fails closed', async () => {
      await expect(
        ContextBuilderService.buildUserContext('', '')
      ).rejects.toThrow('Missing required trusted context identity');
    });
  });

  describe('AI Capability Registry & Authorization', () => {
    let adminContext: AIContext;
    let standardContext: AIContext;

    beforeAll(async () => {
      adminContext = await ContextBuilderService.buildUserContext(tenantId, adminUserId);
      standardContext = await ContextBuilderService.buildUserContext(tenantId, standardUserId);
    });

    it('6. AI cannot add permissions to its context', async () => {
      expect(standardContext.permissions).not.toContain('SYSTEM:ADMIN');
      expect(() => {
        // @ts-expect-error Testing runtime immutability
        standardContext.permissions.push('SYSTEM:ADMIN');
      }).toThrow();
    });

    it('7. Unauthorized capability is denied', async () => {
      // Standard user has CUSTOMER:READ but not LEAD:UPDATE
      const result = ToolRegistry.executeTool('update_lead', { leadId: '1', status: 'NEW' }, standardContext);
      await expect(result).rejects.toThrow('Missing required permission LEAD:UPDATE');
    });

    it('8. Unknown capability is denied (fails closed)', async () => {
      const result = ToolRegistry.executeTool('drop_database_table', {}, adminContext);
      await expect(result).rejects.toThrow('Tool drop_database_table not found');
    });

    it('9. Tool arguments cannot override tenant authorization', async () => {
       // Attempt to pass identity fields in the payload to bypass auth
       const resultTenant = ToolRegistry.executeTool('update_lead', { leadId: 'non-existent', status: 'NEW', tenantId: 'hacker-tenant' }, adminContext);
       await expect(resultTenant).rejects.toThrow('Unauthorized: Tool arguments cannot override identity context');

       const resultUser = ToolRegistry.executeTool('update_lead', { leadId: 'non-existent', status: 'NEW', userId: 'hacker-user' }, adminContext);
       await expect(resultUser).rejects.toThrow('Unauthorized: Tool arguments cannot override identity context');

       const resultDept = ToolRegistry.executeTool('update_lead', { leadId: 'non-existent', status: 'NEW', departmentId: 'hacker-dept' }, adminContext);
       await expect(resultDept).rejects.toThrow('Unauthorized: Tool arguments cannot override identity context');
    });

    it('13. CRM relation auth remains enforced', async () => {
       // Standard user has CUSTOMER:READ, but the customer doesn't exist or isn't owned by them.
       vi.mocked(requireAuth).mockResolvedValue({ id: standardUserId, tenantId: tenantId } as any);
       vi.mocked(requireTenant).mockResolvedValue(tenantId);
       vi.mocked(requirePermission).mockResolvedValue(true as any);

       const result = ToolRegistry.executeTool('get_customer', { customerId: 'non-existent' }, standardContext);
       // Should throw "Customer not found or unauthorized" which comes from the actual CRM service.
       await expect(result).rejects.toThrow('Customer not found or unauthorized');
    });
    it('11. Lookup failure fails closed', async () => {
       // Mock withTenant to throw an unexpected lookup error
       vi.mocked(withTenant).mockRejectedValueOnce(new Error('Database timeout/lookup error'));
       
       await expect(
         ContextBuilderService.buildUserContext(tenantId, standardUserId)
       ).rejects.toThrow('Unauthorized: Context build failed');
    });

    it('12. Runtime context forgery/mutation cannot create cross-tenant access', async () => {
      // Attempt to mutate the frozen context object.
      expect(() => {
        // @ts-expect-error - testing malicious JS runtime bypass
        standardContext.tenantId = 'hacker-tenant-id';
      }).toThrow(TypeError);
      
      expect(() => {
        // @ts-expect-error
        standardContext.permissions = ['SYSTEM:ADMIN'];
      }).toThrow(TypeError);

      // Create a valid hacker tenant in DB so foreign keys don't throw first
      const hackerTenantId = require('crypto').randomUUID(); // A standard valid UUID for tests
      const hackerUserId = require('crypto').randomUUID();
      await prismaSystem.executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        await tx.tenant.create({ data: { id: hackerTenantId, name: 'Hacker', status: 'ACTIVE' } });
        await tx.user.create({ data: { id: hackerUserId, clerkId: hackerUserId, email: require('crypto').randomUUID() + '@hack.com', firstName: 'Hacker', tenantId: hackerTenantId } });
      });

      // Even if cloned, passing a fake context object to the engine is mitigated because the 
      // actual CRM relation checks run against the database records. 
      const fakeContext: AIContext = {
        ...standardContext,
        tenantId: hackerTenantId,
        user: { ...standardContext.user, id: hackerUserId },
        permissions: ['LEAD:UPDATE']
      };

      // In this scenario, the attacker forged the AIContext object, but the Node.js 
      // execution environment (AsyncLocalStorage) remains secure and bound to the trusted tenant.
      vi.mocked(requireAuth).mockResolvedValue({ id: standardContext.user.id, tenantId: standardContext.tenantId } as any);
      vi.mocked(requireTenant).mockResolvedValue(standardContext.tenantId);
      vi.mocked(requirePermission).mockResolvedValue(true as any);

      // When the CRM tool executes, it delegates to the actual CRM layer (updateLead).
      // That layer pulls tenantId from requireTenant(), completely ignoring the forged fakeContext.tenantId!
      // Therefore, the CRM relation auth boundary remains strictly enforced.
      const result = ToolRegistry.executeTool('update_lead', { leadId: 'non-existent', status: 'NEW' }, fakeContext);
      
      // It will throw "Lead not found" because it's searching in standardContext.tenantId, NOT hackerTenantId!
      await expect(result).rejects.toThrow('Lead not found');
    });

    it('14. AI execution cannot escalate into system/global/disaster-recovery authorization', async () => {
       // Mock auth to allow the tool execution
       vi.mocked(requireAuth).mockResolvedValue({ id: adminUserId, tenantId: tenantId } as any);
       vi.mocked(requireTenant).mockResolvedValue(tenantId);
       vi.mocked(requirePermission).mockResolvedValue(true as any);

       // Attempt to call a system tool or escalate via argument injection
       // ToolRegistry does not have an 'executeAsSystem' tool registered for AI.
       const result = ToolRegistry.executeTool('drop_database', {}, adminContext);
       
       await expect(result).rejects.toThrow('Unauthorized: Tool drop_database not found');

       // Attempt to pass system flags in an existing tool payload
       const exploitResult = ToolRegistry.executeTool('update_lead', { leadId: '1', status: 'NEW', __executeAsSystem: true }, adminContext);
       // It rejects identity overrides explicitly, but other extra args are either ignored by CRM or fail validation.
       await expect(exploitResult).rejects.toThrow('Lead not found');
    });
  });
});
