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
  async ({ event, step }: { event: { data: SecureJobEnvelope<any> }, step: any }) => {
    return await step.run('process-outbox-event', async () => {
      
      // CALL_COMPLETED handled outside transaction due to long-running AI API calls
      if (event.data.jobType === 'CALL_COMPLETED') {
        const { processCallCompleted } = await import('@/modules/communication/jobs/call-transcription.worker');
        return await processCallCompleted(event.data);
      }

      return await withJobContext(event.data, async (tx, payload) => {
        
        if (event.data.jobType === 'CCTV.AI_EVENT.DETECTED') {
          const aiEventId = payload.aiEventId;
          const cameraId = payload.cameraId;
          
          const camera = await tx.camera.findFirst({ where: { id: cameraId }, include: { location: true } });
          if (!camera) throw new Error("Camera not found");

          let severity: any = 'LOW';
          const obj = payload.detectedObject.toLowerCase();
          if (obj.includes('person')) {
            severity = 'HIGH';
          } else if (obj.includes('vehicle')) {
            severity = 'MEDIUM';
          } else if (obj.includes('restricted') || obj.includes('intrusion')) {
            severity = 'CRITICAL';
          }

          const title = `Security Alert: ${payload.detectedObject}`;

          if (camera.location) {
            await tx.incident.create({
              data: {
                tenantId: event.data.tenantId,
                locationId: camera.locationId!,
                cameraId: camera.id,
                aiEventId: aiEventId,
                title,
                severity,
                status: 'OPEN',
              }
            });

            await tx.activityTimeline.create({
              data: {
                tenantId: event.data.tenantId,
                type: 'SYSTEM',
                content: `${title} [${severity}] at ${camera.name} (${Math.round(payload.confidence * 100)}% confidence)`,
                actorId: payload.actorId,
                entityType: 'CUSTOMER',
                entityId: camera.location.customerId
              }
            });

            // Create Notification directly in the transaction to ensure rollback on failure
            await tx.notification.create({
              data: {
                tenantId: event.data.tenantId,
                userId: payload.actorId,
                type: 'ALERT',
                title: 'Camera AI Event',
                body: 'AI detected a significant event.',
                isRead: false
              }
            });
          }
        } else {
          // Fallback for other events
          await EventBus.emit(event.data.jobType, {
            tenantId: event.data.tenantId,
            ...(payload as object)
          });
        }
        
        return { success: true };
      });
    });
  }
);
