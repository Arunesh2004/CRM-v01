import { inngest } from '../inngest.client';
import { SecureJobEnvelope } from '../types';
import { withJobContext } from '../worker';
import { PrismaClient } from '@prisma/client';

const globalPrisma = new PrismaClient();

export const webhookWorker = inngest.createFunction(
  { 
    id: 'webhook-worker',
    triggers: [{ event: 'webhook.ingested' }],
    concurrency: {
      limit: 10,
      key: 'event.data.tenantId'
    }
  },
  async ({ event, step }: { event: { data: SecureJobEnvelope<{ webhookEventId: string }> }, step: any }) => {
    return await step.run('process-webhook', async () => {
      return await withJobContext(event.data, async (tx, payload) => {
        const { webhookEventId } = payload;
        
        // Ensure webhook exists and is unhandled
        const webhook = await tx.webhookEvent.findUnique({
          where: { id: webhookEventId }
        });

        if (!webhook || webhook.status !== 'PENDING') {
          return { skipped: true, reason: 'Already processed or not found' };
        }

        // Example: route to specific provider handlers here based on webhook.provider
        // For Phase 11, we just mark as PROCESSED to prove the pipeline

        await tx.webhookEvent.update({
          where: { id: webhookEventId },
          data: { status: 'PROCESSED' }
        });

        return { success: true };
      });
    });
  }
);
