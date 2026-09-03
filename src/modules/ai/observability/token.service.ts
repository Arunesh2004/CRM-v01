import { Logger } from '@/lib/logger/logger';
import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import prisma from '../../../../database/utils/prisma';
import { TokenUsage } from '../providers/ai-provider.interface';

export class AIObservabilityService {
  /**
   * Records token usage for financial tracking and limits
   */
  static async trackUsage(
    tenantId: string,
    userId: string,
    model: string,
    usage: TokenUsage,
    latencyMs: number,
    workflowId?: string,
    aiExecutionId?: string
  ) {
    try {
      // Calculate approximate cost (Mock pricing)
      // e.g., $0.0015 per 1K input, $0.002 per 1K output
      const cost = (usage.inputTokens / 1000) * 0.0015 + (usage.outputTokens / 1000) * 0.002;

      await withTenant(tenantId).aITokenUsage.create({
        data: {
          tenantId,
          userId,
          model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          latencyMs,
          cost,
          workflowId,
          aiExecutionId
        }
      });
    } catch (error) {
      Logger.error('Failed to track AI token usage', { error: (error as any).message });
      // We don't throw here to avoid failing the primary business logic just because observability failed
    }
  }
}
