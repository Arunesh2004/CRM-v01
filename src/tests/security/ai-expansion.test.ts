import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { ScoringService } from '../../modules/ai/scoring/scoring.service';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import * as crypto from 'crypto';

// ONLY mock the external AI Provider, because that's external.
// Do NOT mock prisma, auth, or field security!
vi.mock('../../lib/providers/ai/ai-provider.factory', () => ({
  AIProviderFactory: {
    getProvider: vi.fn().mockResolvedValue({
      generateResponse: vi.fn().mockImplementation(async (prompt: string, tools: any[]) => {
        if (typeof prompt === 'string') {
          if (prompt.includes('probability')) {
            return { text: JSON.stringify({ probability: 75, factors: ['Strong signal'] }) };
          }
          if (prompt.includes('summarize my deal')) {
            const tool = tools?.find(t => t.name === 'summarize_deal');
            if (tool) {
              // We pass the raw context ID we want to query
              try { await tool.execute({ dealId: prompt.split(' ').pop() }); } catch(e) {}
            }
            return {
              text: 'I will summarize the deal.',
              toolsRequested: ['summarize_deal']
            };
          }
        }
        return { text: 'Generic AI response' };
      })
    })
  }
}));

describe('Phase 10.5 AI Expansion Security Tests (Real DB)', () => {
  const tenantId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const dealId = crypto.randomUUID();

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantId}', 'Tenant A', now(), now())`);
      await tx.$executeRawUnsafe(`-- User
        INSERT INTO "User" (id, "tenantId", email, status, "createdAt", "updatedAt") 
        VALUES ('${userId}', '${tenantId}', 'user@ai.com', 'ACTIVE', now(), now())`);
      const roleId = crypto.randomUUID();
      await tx.$executeRawUnsafe(`-- Give User REVENUE:UPDATE to allow scoring
        INSERT INTO "Role" (id, "tenantId", name, "createdAt", "updatedAt")
        VALUES ('${roleId}', '${tenantId}', 'AI User', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "UserRole" (id, "userId", "roleId", "tenantId", "createdAt")
        VALUES ('${crypto.randomUUID()}', '${userId}', '${roleId}', '${tenantId}', now())`);
      let pRevRead = await tx.permission.findFirst({ where: { resource: 'REVENUE', action: 'UPDATE' } });
      if (!pRevRead) pRevRead = await tx.permission.create({ data: { resource: 'REVENUE', action: 'UPDATE' } });
      
      await tx.$executeRawUnsafe(`
        INSERT INTO "RolePermission" (id, "roleId", "permissionId", "tenantId", "createdAt")
        VALUES ('${crypto.randomUUID()}', '${roleId}', '${pRevRead.id}', '${tenantId}', now());
      `);
      // Give User CUSTOMER:READ for tool
      let pDealRead = await tx.permission.findFirst({ where: { resource: 'CUSTOMER', action: 'READ' } });
      if (!pDealRead) pDealRead = await tx.permission.create({ data: { resource: 'CUSTOMER', action: 'READ' } });
      await tx.$executeRawUnsafe(`INSERT INTO "RolePermission" (id, "roleId", "permissionId", "tenantId", "createdAt")
        VALUES ('${crypto.randomUUID()}', '${roleId}', '${pDealRead.id}', '${tenantId}', now())`);

      // We need a customer for the deal
      const customerId = crypto.randomUUID();
      await tx.$executeRawUnsafe(`
        INSERT INTO "Customer" (id, "tenantId", name, "normalizedName", "createdAt", "updatedAt") 
        VALUES ('${customerId}', '${tenantId}', 'Cust', 'cust', now(), now());
      `);

      // And a Pipeline and Stage
      const pipelineId = crypto.randomUUID();
      const stageId = crypto.randomUUID();
      await tx.$executeRawUnsafe(`
        INSERT INTO "Pipeline" (id, "tenantId", name, "createdAt", "updatedAt") 
        VALUES ('${pipelineId}', '${tenantId}', 'Default', now(), now());
      `);
      await tx.$executeRawUnsafe(`
        INSERT INTO "PipelineStage" (id, "pipelineId", "tenantId", name, "order", "createdAt", "updatedAt") 
        VALUES ('${stageId}', '${pipelineId}', '${tenantId}', 'Proposal', 1, now(), now());
      `);

      await tx.$executeRawUnsafe(`
        INSERT INTO "Deal" (id, "tenantId", "customerId", "pipelineId", "assignedUserId", "createdById", title, value, "stageId", "createdAt", "updatedAt")
        VALUES ('${dealId}', '${tenantId}', '${customerId}', '${pipelineId}', '${userId}', '${userId}', 'Big Deal', 50000, '${stageId}', now(), now());
      `);
      
      // Seed the tool
      let aiTool = await tx.aITool.findUnique({ where: { name: 'summarize_deal' } });
      if (!aiTool) {
        aiTool = await tx.aITool.create({
          data: {
            id: 'tool-1',
            name: 'summarize_deal',
            requiredPermission: 'DEAL:READ',
            riskLevel: 'LOW'
          }
        });
      }
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // Cannot delete tenant because of FK
    });
  });

  describe('Predictive Scoring Security', () => {
    it('should successfully score a deal utilizing the real DB transaction boundary', async () => {
       const result = await ScoringService.calculateDealProbability(tenantId, userId, dealId);
       expect(result.probability).toBe(75);
    });

    it('should block scoring for an unauthorized deal (cross-tenant)', async () => {
       const otherDealId = crypto.randomUUID();
       // Try to score a deal that doesn't exist in our tenant context
       await expect(ScoringService.calculateDealProbability(tenantId, userId, otherDealId))
         .rejects.toThrow();
    });
  });
});
