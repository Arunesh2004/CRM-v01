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
    retries: 3,
    onFailure: async ({ event, error }) => {
      const { getFailureEventIdSafe, sendToDeadLetterQueue } = await import('../worker');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
      const safeEvent = event as { data: { event: { data: any, attemptCount?: number } } };
      const originalEvent = safeEvent.data.event;
      const envelope = originalEvent.data;
      if (envelope && envelope.tenantId) {
        const eventId = getFailureEventIdSafe(event);
        await sendToDeadLetterQueue(envelope, new Error(error.message), originalEvent.attemptCount ?? 1, eventId);
      }
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  },
  outboxWorkerHandler
);

export async function outboxWorkerHandler({ event, step }: { event: { data: SecureJobEnvelope<any> }, step: any }) {
    return await step.run('process-outbox-event', async () => {
      
      // CALL_COMPLETED handled outside transaction due to long-running AI API calls
      if (event.data.jobType === 'CALL_COMPLETED') {
        const { processCallCompleted } = await import('@/modules/communication/jobs/call-transcription.worker');
        return await processCallCompleted(event.data);
      }

      // Decouple Provider Network Calls from DB Transaction
      if (event.data.jobType === 'SEND_EMAIL') {
        const idempotencyKey = event.data.jobId;
        const emailPayload = {
          ...event.data.payload,
          headers: { ...(event.data.payload as any).headers, 'Idempotency-Key': idempotencyKey }
        };

        // 1. Authorize & Establish State (In Transaction)
        await step.run('authorize-and-record-email', async () => {
          return await withJobContext(event.data, async (tx) => {
            return { success: true };
          });
        });

        // 2. Deliver via Provider (Outside Transaction)
        const result = await step.run('deliver-email', async () => {
          const { ProviderFactory } = await import('@/lib/providers/provider.factory');
          const provider = ProviderFactory.getEmailProvider();
          return await provider.sendEmail(event.data.tenantId, emailPayload);
        });

        if (!result.success) {
          const { Logger } = await import('@/lib/logger/logger');
          const { ProviderPermanentError, ProviderTransientError, ProviderConfigurationError } = await import('@/lib/observability/errors');
          const errorMsg = result.error || 'Unknown error';
          let errObj: Error;
          let isPermanent = false;
          if (errorMsg.includes('not configured')) {
            errObj = new ProviderConfigurationError(`Email not configured: ${errorMsg}`);
            isPermanent = true;
          } else if (errorMsg.includes('invalid_email') || errorMsg.includes('rejected') || errorMsg.includes('not_found')) {
            errObj = new ProviderPermanentError(`Permanent email failure: ${errorMsg}`);
            isPermanent = true;
          } else {
            errObj = new ProviderTransientError(`Transient email failure: ${errorMsg}`);
          }
          if (isPermanent) {
            Logger.error('Email Provider failed permanently', errObj, { jobId: event.data.jobId });
            const { NonRetriableError } = await import('inngest');
            throw new NonRetriableError(errObj.message);
          }
          Logger.warn('Email Provider failed transiently', errObj, { jobId: event.data.jobId });
          throw errObj;
        }
        return { success: true };
      }

      if (event.data.jobType === 'SEND_SMS') {
        const idempotencyKey = event.data.jobId;
        
        await step.run('authorize-and-record-sms', async () => {
          return await withJobContext(event.data, async (tx) => {
            return { success: true };
          });
        });

        const result = await step.run('deliver-sms', async () => {
          const { ProviderFactory } = await import('@/lib/providers/provider.factory');
          const provider = ProviderFactory.getTelephonyProvider();
          return await provider.sendSms(event.data.tenantId, {
            ...(event.data.payload as any),
            idempotencyKey
          });
        });

        if (!result.success) {
          const { Logger } = await import('@/lib/logger/logger');
          const { ProviderPermanentError, ProviderTransientError, ProviderConfigurationError } = await import('@/lib/observability/errors');
          const errorMsg = result.error || 'Unknown error';
          let errObj: Error;
          let isPermanent = false;
          if (errorMsg.includes('not configured')) {
            errObj = new ProviderConfigurationError(`SMS not configured: ${errorMsg}`);
            isPermanent = true;
          } else if (errorMsg.includes('unregistered') || errorMsg.includes('invalid_number')) {
            errObj = new ProviderPermanentError(`Permanent SMS failure: ${errorMsg}`);
            isPermanent = true;
          } else {
            errObj = new ProviderTransientError(`Transient SMS failure: ${errorMsg}`);
          }
          if (isPermanent) {
            Logger.error('SMS Provider failed permanently', errObj, { jobId: event.data.jobId });
            const { NonRetriableError } = await import('inngest');
            throw new NonRetriableError(errObj.message);
          }
          Logger.warn('SMS Provider failed transiently', errObj, { jobId: event.data.jobId });
          throw errObj;
        }
        return { success: true };
      }

      if (event.data.jobType === 'MAKE_CALL') {
        const idempotencyKey = event.data.jobId;

        await step.run('authorize-and-record-call', async () => {
          return await withJobContext(event.data, async (tx) => {
            return { success: true };
          });
        });

        const result = await step.run('deliver-call', async () => {
          const { ProviderFactory } = await import('@/lib/providers/provider.factory');
          const provider = ProviderFactory.getTelephonyProvider();
          return await provider.initiateCall(event.data.tenantId, {
            ...(event.data.payload as any),
            idempotencyKey
          });
        });

        if (!result.success) {
          const { Logger } = await import('@/lib/logger/logger');
          const { ProviderPermanentError, ProviderTransientError, ProviderConfigurationError } = await import('@/lib/observability/errors');
          const errorMsg = result.error || 'Unknown error';
          let errObj: Error;
          let isPermanent = false;
          if (errorMsg.includes('not configured')) {
            errObj = new ProviderConfigurationError(`Telephony not configured: ${errorMsg}`);
            isPermanent = true;
          } else if (errorMsg.includes('unregistered') || errorMsg.includes('invalid_number')) {
            errObj = new ProviderPermanentError(`Permanent Call failure: ${errorMsg}`);
            isPermanent = true;
          } else {
            errObj = new ProviderTransientError(`Transient Call failure: ${errorMsg}`);
          }
          if (isPermanent) {
            Logger.error('Call Provider failed permanently', errObj, { jobId: event.data.jobId });
            const { NonRetriableError } = await import('inngest');
            throw new NonRetriableError(errObj.message);
          }
          Logger.warn('Call Provider failed transiently', errObj, { jobId: event.data.jobId });
          throw errObj;
        }
        return { success: true };
      }

      return await withJobContext(event.data, async (tx, payload) => {
        if (event.data.jobType === 'CCTV.AI_EVENT.DETECTED') {
          const aiEventId = payload.aiEventId;
          const cameraId = payload.cameraId;
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
          const camera = await tx.camera.findFirst({ where: { id: cameraId }, include: { location: true } });
          if (!camera) throw new Error("Camera not found");

          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
        } else if (event.data.jobType === 'cctv.recording.completed' || event.data.jobType === 'QUOTE_APPROVED' || event.data.jobType === 'NOTIFICATION_SEND' || event.data.jobType === 'workflow.execute') {
          // Explicitly whitelist and relay events to the distributed Inngest pipeline
          await inngest.send({
            name: event.data.jobType,
            data: {
              ...event.data
            }
          });
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
