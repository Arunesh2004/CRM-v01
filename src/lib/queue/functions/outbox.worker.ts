import { inngest } from '../inngest.client';
import { withJobContext } from '../worker';
import { SecureJobEnvelope } from '../types';
import { EventBus } from '@/modules/core/events/event-bus';

export const outboxWorker = inngest.createFunction(
  { 
    id: 'outbox-worker',
    triggers: [{ event: 'outbox.process' }],
    concurrency: {
      limit: 10,
      key: 'event.data.tenantId' 
    }
  },
  async ({ event, step }: { event: { data: SecureJobEnvelope<{ eventId: string }> }, step: any }) => {
    return await step.run('process-outbox-event', async () => {
      return await withJobContext(event.data, async (tx, payload) => {
        // Emit to the local EventBus so local handlers (like notification.handlers.ts) can fire
        // Since we are now running in a background worker context, those synchronous handlers 
        // will not block the main HTTP request that originated the event.
        await EventBus.emit(event.data.jobType, {
          tenantId: event.data.tenantId,
          ...(payload as object)
        });
        
        return { success: true };
      });
    });
  }
);
