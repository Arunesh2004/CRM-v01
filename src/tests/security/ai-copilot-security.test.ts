import { describe, it, expect, beforeEach, vi } from 'vitest';
import prisma from '@db/utils/prisma';
import { withTenant } from '@db/utils/prisma-tenant';
import { ConversationService } from '@/modules/ai/conversation.service';
import { AIPermissionService } from '@/modules/ai-permissions/ai-permission.service';
import { crmTools } from '@/modules/ai/tools/crm.tools';
import { ToolRegistry } from '@/modules/ai/tools/registry';
import { randomUUID } from 'crypto';

describe('Phase C7 - AI Copilot Security & Isolation', () => {
  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userB: any;

  beforeEach(async () => {
    // 1. Setup Tenants
    tenantA = await prisma.tenant.create({ data: { name: `Tenant A ${randomUUID()}` } });
    tenantB = await prisma.tenant.create({ data: { name: `Tenant B ${randomUUID()}` } });

    // 2. Setup Users
    userA = await withTenant(tenantA.id).user.create({ data: { email: `a-${randomUUID()}@example.com`, tenantId: tenantA.id } });
    userB = await withTenant(tenantB.id).user.create({ data: { email: `b-${randomUUID()}@example.com`, tenantId: tenantB.id } });

    // 3. Setup AI Tools in DB
    await ToolRegistry.bootstrapTools();

    // 4. (Skipping complex RBAC data seeding in favor of mocking where needed)
  });

  describe('A. Conversation Cross-Tenant IDOR', () => {
    it('prevents Tenant B from accessing Tenant A conversations', async () => {
      // Create conv in Tenant A
      const convA = await ConversationService.createConversation(tenantA.id, userA.id, 'Test');
      
      // Attempt access from Tenant B context
      const result = await ConversationService.getOwnedConversation(tenantB.id, userB.id, convA.id);
      expect(result).toBeNull();
      
      // Attempt adding message from Tenant B context
      const addRes = await ConversationService.addMessage(tenantB.id, userB.id, convA.id, 'USER', 'Hack');
      expect(addRes.success).toBe(false);
      expect(addRes.error).toContain('Conversation not found');
    });
  });

  describe('C. Prompt-Based RBAC Bypass', () => {
    it('prevents user without UPDATE permission from executing update_lead tool', async () => {
      // Create userC with absolutely no permissions
      const userC = await withTenant(tenantA.id).user.create({ data: { email: `c-${randomUUID()}@example.com`, tenantId: tenantA.id } });
      
      const updateLeadTool = crmTools.find(t => t.name === 'update_lead');
      expect(updateLeadTool).toBeDefined();

      let errorMsg = '';
      try {
        await updateLeadTool!.execute({ leadId: '123', status: 'QUALIFIED' }, { tenantId: tenantA.id, userId: userC.id });
      } catch (err: any) {
        errorMsg = err.message;
      }
      expect(errorMsg).toContain('403: Forbidden - AI lacks inherited permission');
    });
  });

  describe('E. Cross-Tenant Tool Access', () => {
    it('prevents search_crm from returning data from another tenant', async () => {
      // Create customer in Tenant B
      await withTenant(tenantB.id).customer.create({
        data: {
          tenantId: tenantB.id,
          name: 'Secret Acme Corp',
          normalizedName: 'secret acme corp'
        }
      });

      // Mock RBAC to succeed so we test the query isolation
      const spy = vi.spyOn(AIPermissionService, 'requestToolExecution').mockResolvedValue(true as any);

      // Execute search_crm as User A (Tenant A)
      const searchTool = crmTools.find(t => t.name === 'search_crm');
      const results = await searchTool!.execute({ query: 'Acme' }, { tenantId: tenantA.id, userId: userA.id });
      
      // Results should be empty because 'Secret Acme Corp' is in Tenant B
      expect(results.length).toBe(0);
      
      spy.mockRestore();
    });
  });

  describe('F. Provider Failure Simulation', () => {
    it('returns a safe structured error when tool throws an exception', async () => {
       const searchTool = crmTools.find(t => t.name === 'get_customer');
       
       // Pass a completely invalid UUID to force an error in the underlying service
       let result: any;
       try {
         result = await searchTool!.execute({ customerId: 'invalid-id' }, { tenantId: tenantA.id, userId: userA.id });
       } catch (err: any) {
         result = err;
       }
       // The wrapper in copilot.service catches these and pushes { error: msg }, but since we're calling execute directly here we expect it to throw gracefully without crashing the Node process.
       expect(result.message).toBeDefined();
    });
  });
});
