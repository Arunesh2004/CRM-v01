import { inngest } from '../inngest.client';
import { SecureJobEnvelope } from '../types';
import { withJobContext } from '../worker';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { SLAService } from '@/modules/support/sla.service';

// Cron job to trigger SLA evaluation across all active tenants
export const slaEvaluateCron = inngest.createFunction(
  { 
    id: 'sla-evaluate-cron', 
    triggers: [{ cron: '*/5 * * * *' }] 
  }, // Every 5 minutes
  async ({ step }: { step: any }) => {
    // Note: This cron job executes WITHOUT a tenant context.
    // It is strictly a dispatcher. It must not touch customer data.
    const tenants = await step.run('fetch-active-tenants', async () => {
      return executeAsSystem(SystemOperation.PLATFORM_CRON, async (tx) => {
        return tx.tenant.findMany({
          where: { deletedAt: null },
          select: { id: true }
        });
      });
    });

    const events = tenants.map((t: any) => ({
      name: 'sla.evaluate',
      data: {
        jobId: `sla-eval-${t.id}-${Date.now()}`,
        tenantId: t.id,
        actorType: 'SYSTEM',
        correlationId: `cron-${Date.now()}`,
        jobType: 'sla.evaluate',
        payload: {},
        schemaVersion: '1.0'
      }
    }));

    if (events.length > 0) {
      await step.sendEvent('dispatch-sla-events', events);
    }

    return { dispatched: events.length };
  }
);

// Worker to evaluate SLAs for a specific tenant
export const slaEvaluateWorker = inngest.createFunction(
  { 
    id: 'sla-evaluate-worker',
    triggers: [{ event: 'sla.evaluate' }],
    concurrency: {
      limit: 10,
      key: 'event.data.tenantId' // Prevent one tenant from monopolizing workers
    },
    onFailure: async ({ event, error }) => {
      const { getFailureEventIdSafe, sendToDeadLetterQueue } = await import('../worker');
      const safeEvent = event as { data: { event: { data: any, attemptCount?: number } } };
      const originalEvent = safeEvent.data.event;
      const envelope = originalEvent.data;
      if (envelope && envelope.tenantId) {
        const eventId = getFailureEventIdSafe(event);
        await sendToDeadLetterQueue(envelope, new Error(error.message), originalEvent.attemptCount ?? 1, eventId);
      }
    },
  },
  async ({ event, step }: { event: { data: SecureJobEnvelope<{ ticketId?: string }> }, step: any }) => {
    return await step.run('process-sla-breaches', async () => {
      return await withJobContext(event.data, async (tx, payload) => {
        // Business logic runs securely inside withTenant
        await SLAService.processSLABreaches(event.data.tenantId);
        return { success: true };
      });
    });
  }
);
