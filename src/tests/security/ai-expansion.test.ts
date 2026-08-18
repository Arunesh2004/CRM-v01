import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScoringService } from '@/modules/ai/scoring/scoring.service';
import { CopilotService } from '@/modules/ai/copilot/copilot.service';
import prisma from '@/../database/utils/prisma';
import { checkPermission, requirePermissionFast } from '@/lib/auth';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ userId: 'mock-user-123' }),
  requireTenant: vi.fn().mockReturnValue('mock-tenant-456'),
  checkPermission: vi.fn().mockResolvedValue(true),
  requirePermissionFast: vi.fn().mockResolvedValue(true),
  requirePermission: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/providers/ai/ai-provider.factory', () => ({
  AIProviderFactory: {
    getProvider: vi.fn().mockResolvedValue({
      generateResponse: vi.fn().mockImplementation(async (prompt: string, tools: any[]) => {
        if (prompt && typeof prompt === 'string') {
          if (prompt.includes('probability')) {
            return { text: JSON.stringify({ probability: 75, factors: ['Strong signal'] }) };
          }
          if (prompt.includes('score')) {
            return { text: JSON.stringify({ score: 85.5, factors: ['Active'] }) };
          }
          // Copilot mocks
          if (prompt.includes('summarize my deal 123')) {
            const tool = tools?.find(t => t.name === 'summarize_deal');
            if (tool) {
              try { await tool.execute({ dealId: '123' }); } catch(e) {}
            }
            return {
              text: 'I will summarize the deal.',
              toolsRequested: ['summarize_deal']
            };
          }
          if (prompt.includes('Tool Results:')) {
             return { text: 'Here is the summary based on tools.' };
          }
        } else if (prompt && (prompt as any).userPrompt) {
            // fallback in case prompt is passed as an object
            const args = prompt as any;
            if (args.userPrompt?.includes('probability')) return { text: JSON.stringify({ probability: 75, factors: ['Strong signal'] }) };
            if (args.userPrompt?.includes('score')) return { text: JSON.stringify({ score: 85.5, factors: ['Active'] }) };
        }
        return { text: 'Generic response' };
      })
    })
  }
}));

vi.mock('@/modules/security/field-security/field-security.service', () => ({
  FieldSecurityService: {
    maskFields: vi.fn().mockImplementation(async (tenantId, userId, resource, data) => {
      // Mock masking logic
      if (resource === 'DEAL' && data.id === '123') {
         const masked = { ...data };
         delete masked.value; // Hide value
         return masked;
      }
      return data;
    })
  }
}));

// Mock prisma
vi.mock('@/../database/utils/prisma', () => ({
  default: {
    deal: {
      findFirst: vi.fn().mockImplementation(async (args) => {
        if (args.where.id === '123' && args.where.tenantId === 'mock-tenant-456') {
          return { id: '123', tenantId: 'mock-tenant-456', title: 'Big Deal', value: 50000, stage: { name: 'Proposal' }, tasks: [], quotes: [] };
        }
        return null;
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    lead: {
      findFirst: vi.fn().mockImplementation(async (args) => {
        if (args.where.id === '456' && args.where.tenantId === 'mock-tenant-456') {
          return { id: '456', tenantId: 'mock-tenant-456', name: 'John Doe' };
        }
        return null;
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    customer: {
       findFirst: vi.fn().mockImplementation(async (args) => {
         if (args.where.id === '789' && args.where.tenantId === 'mock-tenant-456') {
           return { id: '789', tenantId: 'mock-tenant-456', name: 'Acme Corp' };
         }
         return null;
       }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    aITool: {
      upsert: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue({ id: 'tool-1', name: 'summarize_deal', requiredPermission: 'DEAL:READ', riskLevel: 'LOW' }),
    },
    aIExecution: {
      create: vi.fn().mockResolvedValue({ id: 'exec-1' })
    },
    securityEvent: {
      create: vi.fn().mockResolvedValue({})
    },
    aBACPolicy: {
      findMany: vi.fn().mockResolvedValue([])
    },
    $transaction: vi.fn().mockImplementation(async (cb) => {
      if (typeof cb === 'function') {
        const mockTx = {
          $executeRawUnsafe: vi.fn().mockResolvedValue({}),
          aIExecution: { create: vi.fn().mockResolvedValue({ id: 'exec-1' }) },
          auditLog: { create: vi.fn().mockResolvedValue({}) }
        };
        return await cb(mockTx);
      }
      return [];
    })
  }
}));

describe('Phase 10.5 AI Expansion Security Tests', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Predictive Scoring Security', () => {
    it('should successfully score a deal and write to audit log', async () => {
       const result = await ScoringService.calculateDealProbability('mock-tenant-456', 'mock-user-123', '123');
       expect(result.probability).toBe(75);
       expect(result.probabilityFactors).toEqual(['Strong signal']);
       expect(requirePermissionFast).toHaveBeenCalledWith('mock-user-123', 'REVENUE', 'UPDATE');
       expect(prisma.deal.update).toHaveBeenCalledWith({
         where: { id: '123' },
         data: { probability: 75, probabilityFactors: ['Strong signal'] }
       });
       expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('should block scoring if user lacks DEAL_UPDATE permission', async () => {
       const { requirePermissionFast: rpfMock } = await import('@/lib/auth');
       vi.mocked(rpfMock).mockRejectedValueOnce(new Error('Forbidden'));

       await expect(ScoringService.calculateDealProbability('mock-tenant-456', 'mock-user-123', '123'))
         .rejects.toThrow('Forbidden');
         
       expect(prisma.deal.update).not.toHaveBeenCalled();
    });

    it('should prevent cross-tenant deal scoring', async () => {
       await expect(ScoringService.calculateDealProbability('mock-tenant-456', 'mock-user-123', 'wrong-deal-id'))
         .rejects.toThrow('Deal wrong-deal-id not found or unauthorized');
    });
  });

  describe('Copilot FLS and Tenant Boundary Tests', () => {
    it('should mask restricted FLS fields when summarizing a deal via Copilot', async () => {
      const response = await CopilotService.handleChat('mock-tenant-456', 'mock-user-123', 'summarize my deal 123');
      
      expect(response.toolResponses.length).toBe(1);
      
      const toolResult = response.toolResponses[0].result;
      expect(toolResult.id).toBe('123');
      
      // The FLS mock removes `value` from the result
      expect(toolResult.value).toBeUndefined();
    });

    it('should fail tool execution if cross-tenant ID is requested', async () => {
      const { AIProviderFactory } = await import('@/lib/providers/ai/ai-provider.factory');
      
      // Override mock to return a cross-tenant deal ID
      vi.mocked(AIProviderFactory.getProvider).mockResolvedValueOnce({
         generateResponse: vi.fn().mockImplementation(async (prompt: string, tools: any[]) => {
           const tool = tools?.find(t => t.name === 'summarize_deal');
           if (tool) {
             try { await tool.execute({ dealId: 'wrong-deal-id' }); } catch(e) {}
           }
           return {
             text: 'I will try to steal data',
             toolsRequested: ['summarize_deal']
           };
         })
      } as any);

      const response = await CopilotService.handleChat('mock-tenant-456', 'mock-user-123', 'hack deal wrong-deal-id');
      
      expect(response.toolResponses.length).toBe(1);
      expect(response.toolResponses[0].error).toBe('Deal not found or unauthorized');
      expect(response.toolResponses[0].result).toBeUndefined();
    });
  });

});
