import { inngest } from '../inngest.client';
import { withJobContext } from '../worker';
import { SecureJobEnvelope } from '../types';
import { ScoringService } from '@/modules/sales-intel/scoring.service';

export const aiScoringWorker = inngest.createFunction(
  { 
    id: 'ai-scoring-worker',
    triggers: [{ event: 'ai.scoring.calculate' }],
    concurrency: {
      limit: 5,
      key: 'event.data.tenantId' // Prevent API limits from being exhausted by a single tenant
    }
  },
  async ({ event, step }: { event: { data: SecureJobEnvelope<{ entityId: string, entityType: 'LEAD' | 'DEAL' }> }, step: any }) => {
    return await step.run('execute-ai-scoring', async () => {
      return await withJobContext(event.data, async (tx, payload) => {
        const { entityId, entityType } = payload;
        
        // In a real implementation, we would call the LLM here (awaiting safely since we're async)
        // For this foundation, we simulate the AI response and execute the secure mutation
        
        // Simulating the AI execution
        const simulatedScore = Math.floor(Math.random() * 100);
        const simulatedFactors = { reason: 'Async AI evaluation completed', factors: [] };

        if (entityType === 'LEAD') {
          await ScoringService.updateLeadScore(
            event.data.tenantId, 
            entityId, 
            'SYSTEM', 
            'AI', 
            simulatedScore, 
            simulatedFactors
          );
        } else if (entityType === 'DEAL') {
          await ScoringService.updateDealProbabilityFactors(
            event.data.tenantId,
            entityId,
            'SYSTEM',
            'AI',
            simulatedFactors,
            simulatedScore
          );
        }
        
        return { success: true, score: simulatedScore };
      });
    });
  }
);
