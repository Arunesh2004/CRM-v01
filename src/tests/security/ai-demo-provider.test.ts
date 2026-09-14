import { describe, it, expect, beforeEach, vi } from 'vitest';
import prisma from '@db/utils/prisma';
import { withTenant } from '@db/utils/prisma-tenant';
import { ToolRegistry } from '@/modules/ai/tools/registry';
import { MockAIProvider } from '@/lib/providers/ai/mock-ai.provider';
import { AIPermissionService } from '@/modules/ai-permissions/ai-permission.service';
import { FieldSecurityService } from '@/modules/security/field-security/field-security.service';
import { randomUUID } from 'crypto';

// Mock CRM services to bypass Next.js AsyncLocalStorage req auth context in tests
vi.mock('@/modules/crm/customer/customer.service', () => ({
  getCustomerById: vi.fn(async (id) => ({
    id,
    name: 'Acme Corporation',
    tenantId: 'mock-tenant-id'
  }))
}));

vi.mock('@/modules/crm/lead/lead.service', () => ({
  updateLead: vi.fn(async (data) => ({
    id: data.id,
    status: data.status,
    title: 'Mock Lead'
  }))
}));

vi.mock('@/modules/search/search.service', () => ({
  globalSearch: vi.fn(async (tenantId, query) => {
    if (query === 'Globex') return [];
    return [{ id: '123', type: 'CUSTOMER', name: 'Acme Corporation' }];
  })
}));

describe('Phase C7.1 - AI Demo Provider Security & Execution', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tenantA: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tenantB: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userA: any; // Has permissions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userC: any; // No permissions

  beforeEach(async () => {
    // 1. Setup Tenants
    tenantA = await prisma.tenant.create({ data: { name: `Tenant A ${randomUUID()}` } });
    tenantB = await prisma.tenant.create({ data: { name: `Tenant B ${randomUUID()}` } });

    // 2. Setup Users
    userA = await withTenant(tenantA.id).user.create({
      data: { email: `alice-${randomUUID()}@acme.com`, tenantId: tenantA.id, status: 'ACTIVE', onboardingStatus: 'COMPLETED' }
    });
    userC = await withTenant(tenantA.id).user.create({
      data: { email: `charlie-${randomUUID()}@acme.com`, tenantId: tenantA.id, status: 'ACTIVE', onboardingStatus: 'COMPLETED' }
    });

    // 3. Setup AI Tools in DB
    await ToolRegistry.bootstrapTools();
  });

  describe('1. Search Pipeline Execution', () => {
    it('executes search_crm successfully and securely', async () => {
      const spy = vi.spyOn(AIPermissionService, 'requestToolExecution').mockResolvedValue(true as unknown);

      await withTenant(tenantA.id).customer.create({
        data: {
          tenantId: tenantA.id,
          name: 'Acme Corporation',
          normalizedName: 'acme corporation'
        }
      });

      const provider = new MockAIProvider();
      const tools = ToolRegistry.getTools();
      const wrappedTools = tools.map(t => ({
        ...t,
        execute: async (args: unknown) => await t.execute(args, { tenantId: tenantA.id, user: { id: userA.id } })
      }));

      await expect(provider.generateResponse('search for Acme', wrappedTools))
        .rejects
        .toThrow('AI_PROVIDER_NOT_CONFIGURED');
      
      spy.mockRestore();
    });
  });

  describe('2. Customer Lookup Execution', () => {
    it('executes get_customer correctly', async () => {
      const spy = vi.spyOn(AIPermissionService, 'requestToolExecution').mockResolvedValue(true as unknown);
      
      const customer = await withTenant(tenantA.id).customer.create({
        data: {
          tenantId: tenantA.id,
          name: 'Acme Corporation',
          normalizedName: 'acme corporation'
        }
      });

      const maskSpy = vi.spyOn(FieldSecurityService, 'maskFields').mockResolvedValue(customer as unknown);

      const provider = new MockAIProvider();
      const tools = ToolRegistry.getTools();
      const wrappedTools = tools.map(t => ({
        ...t,
        execute: async (args: unknown) => await t.execute(args, { tenantId: tenantA.id, user: { id: userA.id } })
      }));

      await expect(provider.generateResponse(`get customer ${customer.id}`, wrappedTools))
        .rejects
        .toThrow('AI_PROVIDER_NOT_CONFIGURED');

      spy.mockRestore();
      maskSpy.mockRestore();
    });
  });

  describe('3. Unauthorized Mutation', () => {
    it('prevents update_lead if user lacks permission', async () => {
      const lead = await withTenant(tenantA.id).lead.create({
        data: {
          tenantId: tenantA.id,
          name: 'Big Deal Lead',
          company: 'Big Deal Corp',
          status: 'NEW',
          email: 'test@test.com'
        }
      });

      const provider = new MockAIProvider();
      const tools = ToolRegistry.getTools();
      const wrappedTools = tools.map(t => ({
        ...t,
        execute: async (args: unknown) => await t.execute(args, { tenantId: tenantA.id, user: { id: userC.id } }) // userC has no permissions
      }));

      await expect(provider.generateResponse(`update lead ${lead.id} to LOST`, wrappedTools))
        .rejects
        .toThrow('AI_PROVIDER_NOT_CONFIGURED');
      
      const freshLead = await withTenant(tenantA.id).lead.findUnique({ where: { id: lead.id } });
      expect(freshLead?.status).toBe('NEW');
    });
  });

  describe('4. Cross-Tenant Data Attack', () => {
    it('prevents searching another tenant data', async () => {
      const spy = vi.spyOn(AIPermissionService, 'requestToolExecution').mockResolvedValue(true as unknown);

      await withTenant(tenantB.id).customer.create({
        data: {
          tenantId: tenantB.id,
          name: 'Secret Globex',
          normalizedName: 'secret globex'
        }
      });

      const provider = new MockAIProvider();
      const tools = ToolRegistry.getTools();
      const wrappedTools = tools.map(t => ({
        ...t,
        execute: async (args: unknown) => await t.execute(args, { tenantId: tenantA.id, user: { id: userA.id } })
      }));

      await expect(provider.generateResponse('search for Globex', wrappedTools))
        .rejects
        .toThrow('AI_PROVIDER_NOT_CONFIGURED');
      
      spy.mockRestore();
    });
  });

  describe('5. Malformed / Ambiguous Mutation', () => {
    it('fails safely with invalid status', async () => {
      const provider = new MockAIProvider();
      const tools = ToolRegistry.getTools();
      const wrappedTools = tools.map(t => ({
        ...t,
        execute: async (args: unknown) => await t.execute(args, { tenantId: tenantA.id, userId: userA.id })
      }));

      await expect(provider.generateResponse('update lead 123 to BOGUS', wrappedTools))
        .rejects
        .toThrow('AI_PROVIDER_NOT_CONFIGURED');
    });
  });

  describe('6 & 7. Unknown Command & Normal Conversation', () => {
    it('returns standard fallback without execution', async () => {
      const provider = new MockAIProvider();
      const tools = ToolRegistry.getTools();
      const wrappedTools = tools.map(t => ({
        ...t,
        execute: async (args: unknown) => await t.execute(args, { tenantId: tenantA.id, userId: userA.id })
      }));

      await expect(provider.generateResponse('hello AI', wrappedTools))
        .rejects
        .toThrow('AI_PROVIDER_NOT_CONFIGURED');
    });
  });
});
