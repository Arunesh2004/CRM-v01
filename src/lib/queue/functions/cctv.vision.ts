import { inngest } from '../inngest.client';
import { withJobContext } from '../worker';
import { SecureJobEnvelope } from '../types';
import { AIProviderFactory } from '../../providers/ai/ai-provider.factory';
import { CameraEventService } from '@/modules/cctv/camera-event.service';
import { generateSignedDownloadUrl } from '@/lib/providers/storage/s3.provider';
import globalPrisma from '@db/utils/prisma';
import { Logger } from '@/lib/logger/logger';

export const cctvVisionWorker = inngest.createFunction(
  { 
    id: 'cctv-vision-inference-worker',
    triggers: [{ event: 'cctv.recording.completed' }],
    concurrency: {
      limit: 2, // Heavy AI processing, keep limit tight
      key: 'event.data.tenantId'
    },
    onFailure: async ({ event, error }) => {
      const { getFailureEventIdSafe, sendToDeadLetterQueue } = await import('../worker');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeEvent = event as { data: { event: { data: any, attemptCount?: number } } };
      const originalEvent = safeEvent.data.event;
      const envelope = originalEvent.data;
      if (envelope && envelope.tenantId) {
        const eventId = getFailureEventIdSafe(event);
        await sendToDeadLetterQueue(envelope, new Error(error.message), originalEvent.attemptCount ?? 1, eventId);
      }
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ event, step }: { event: { data: SecureJobEnvelope<{ recordingId: string }> }, step: any }) => {
    return await step.run('execute-vision-inference', async () => {
      return await withJobContext(event.data, async (tx, payload) => {
        const { recordingId } = payload;
        
        // 1. Authoritative recording lookup. NEVER trust tenantId from payload for isolation boundary!
        // We look it up in globalPrisma to confirm ownership, and check if camera is decommissioned.
        const recording = await tx.recording.findUnique({
          where: { id: recordingId },
          include: { camera: true }
        });

        if (!recording) {
          Logger.warn('[CCTV Vision] Recording not found, aborting inference', { recordingId });
          return { success: false, reason: 'RECORDING_NOT_FOUND' };
        }

        const authoritativeTenantId = recording.tenantId;

        // If the envelope tenant doesn't match authoritative tenant, alert forged payload!
        if (event.data.tenantId !== authoritativeTenantId) {
          Logger.error('[CCTV Vision] Tenant mismatch detected in job payload! Forgery attempt?', { 
            envelopeTenantId: event.data.tenantId, 
            authoritativeTenantId 
          });
          throw new Error('SECURITY_VIOLATION_TENANT_MISMATCH');
        }

        if (recording.camera.status === 'MAINTENANCE' || recording.camera.deletedAt) {
          Logger.info('[CCTV Vision] Camera is decommissioned, deleted, or in maintenance, skipping AI', { cameraId: recording.camera.id });
          return { success: false, reason: 'CAMERA_INACTIVE' };
        }

        // 2. Idempotency Check: Did we already process this recording?
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingEvents = await tx.$queryRaw<any[]>`
          SELECT id FROM "public"."CameraEvent" 
          WHERE "tenantId" = ${authoritativeTenantId} 
            AND "cameraId" = ${recording.cameraId} 
            AND "metadata"->>'recordingId' = ${recordingId}
          LIMIT 1
        `;

        if (existingEvents && existingEvents.length > 0) {
          Logger.info('[CCTV Vision] Idempotency: Recording already processed by AI.', { recordingId });
          return { success: true, alreadyProcessed: true };
        }

        // 3. Prepare VisionInput
        let signedUrl: string;
        try {
          // Short lived URL (e.g., 5 mins)
          signedUrl = await generateSignedDownloadUrl(recording.storageKey, 300);
        } catch (e) {
          Logger.error('[CCTV Vision] Failed to generate signed URL for recording', { recordingId });
          throw new Error('STORAGE_ACCESS_DENIED');
        }

        // 4. Invoke VisionInferenceProvider
        const provider = AIProviderFactory.getVisionProvider('GEMINI');

        let detections = [];
        try {
          detections = await provider.analyze({
            type: 'URL',
            data: signedUrl,
            mimeType: 'video/mp4' // Assuming mp4 from cctv ingestion daemon
          });
        } catch (error) {
          // If unconfigured, degrade safely without failing job loop repeatedly
          if ((error as Error).message === 'AI_PROVIDER_NOT_CONFIGURED') {
            Logger.info('[CCTV Vision] Provider unconfigured. Degrading gracefully.', { recordingId });
            return { success: false, reason: 'AI_PROVIDER_NOT_CONFIGURED' };
          }
          throw error;
        }

        // 5. Validation and Normalization
        const eventIds = await CameraEventService.processVisionDetections(
          authoritativeTenantId,
          recording.cameraId,
          detections,
          0.65 // Confidence threshold
        );

        // Optionally, attach recordingId to the metadata of the events to guarantee idempotency links
        if (eventIds.length > 0) {
          await tx.cameraEvent.updateMany({
            where: { id: { in: eventIds }, tenantId: authoritativeTenantId },
            data: {
              metadata: { recordingId: recordingId, source: 'VISION_INFERENCE' }
            }
          });
        }

        return { success: true, detectionsProcessed: detections.length, eventsCreated: eventIds.length };
      });
    });
  }
);
