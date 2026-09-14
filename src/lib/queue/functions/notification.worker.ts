import { inngest } from '../inngest.client';
import { SecureJobEnvelope } from '../types';
import prisma from '@db/utils/prisma';
import { NotificationProviderFactory } from '@/infrastructure/notification/notification.factory';
import { Logger } from '@/lib/logger/logger';
import { withIdempotency, IdempotencyOperations } from '@/lib/idempotency';

export const notificationWorker = inngest.createFunction(
  { 
    id: 'notification-send-worker',
    triggers: [{ event: 'NOTIFICATION_SEND' }],
    concurrency: {
      limit: 10,
      key: 'event.data.tenantId' // Prevent API limits from being exhausted by a single tenant
    },
    onFailure: async ({ event, error }) => {
      const { getFailureEventIdSafe, sendToDeadLetterQueue } = await import('../worker');
      const safeEvent = event as { data: { event: { data: unknown, attemptCount?: number } } };
      const originalEvent = safeEvent.data.event;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const envelope = originalEvent.data as SecureJobEnvelope<any>;
      if (envelope && envelope.tenantId) {
        const eventId = getFailureEventIdSafe(event);
        await sendToDeadLetterQueue(envelope, new Error(error.message), originalEvent.attemptCount ?? 1, eventId);
      }
    }
  },
  async ({ event, step }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = event.data.payload as any;
    const tenantId = event.data.tenantId;

    // STEP 1: Idempotent Database Write
    const notification = await step.run('create-notification-db', async () => {
      // Use DB-level idempotency to guarantee duplicate worker executions cannot create duplicate notifications
      return await withIdempotency(
        tenantId,
        'SYSTEM', // System actor
        IdempotencyOperations.SEND_NOTIFICATION,
        event.data.jobId, // The UUID assigned to the EventOutbox transactionally
        payload,
        async (tx) => {
          // Security: Verify user belongs to tenant (N2, N4, N5)
          const targetUser = await tx.user.findFirst({
            where: { id: payload.userId, tenantId: payload.tenantId, deletedAt: null }
          });
          if (!targetUser) {
            throw new Error(`403: Target user does not belong to tenant or is deactivated`);
          }

          return await tx.notification.create({
            data: {
              tenantId: payload.tenantId,
              userId: payload.userId,
              type: payload.type,
              title: payload.title,
              body: payload.body,
              actionUrl: payload.actionUrl
            }
          });
        },
        async (tId, uId, rId) => {
          return await prisma.notification.findUnique({ where: { id: rId } });
        }
      );
    });

    // STEP 2: Best-Effort Realtime Delivery
    await step.run('deliver-realtime', async () => {
      const provider = NotificationProviderFactory.getNotificationProvider();
      
      try {
        await provider.send({
          tenantId: payload.tenantId,
          userId: payload.userId,
          title: payload.title,
          body: payload.body,
          type: payload.type,
          actionUrl: payload.actionUrl
        });
      } catch (err: any) {
        // Realtime Delivery Semantics (Phase 8):
        // 1. The DB write (Step 1) is strictly durable and guaranteed.
        // 2. Realtime provider is best-effort. If it fails transiently, we swallow the error 
        //    because we do NOT want Inngest to retry the entire job (which would re-run DB insert logic).
        // 3. We distinguish permanent configuration errors vs transient network issues via logging.
        const errorMessage = err?.message || 'Unknown error';
        if (errorMessage.includes('credentials') || errorMessage.includes('Unauthorized')) {
           Logger.error('Realtime provider configuration error (Permanent)', { error: errorMessage, tenantId, userId: payload.userId });
           // Swallow error to reach terminal success state (DB already saved).
        } else {
           Logger.warn('Realtime delivery transient failure (Best Effort)', { error: errorMessage, tenantId, userId: payload.userId });
           // Swallow transient errors. The user will see the notification on next page load.
        }
      }
    });
  }
);
