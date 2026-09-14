import { z } from 'zod';
import { withTenant } from '@db/utils/prisma-tenant';
import { CameraEventType } from '@prisma/client';
import { Logger } from '@/lib/logger/logger';
import { NormalizedDetection } from '@/lib/providers/ai/vision-provider.interface';

export const VisionOutputSchema = z.array(
  z.object({
    eventType: z.enum(['MOTION']),
    confidence: z.number().min(0).max(1),
    timestamp: z.string().or(z.date()).transform((val) => new Date(val as unknown as string)),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
);

export class CameraEventService {
  /**
   * Processes untrusted detection output from a vision provider, validating it
   * against the schema, checking thresholds, and securely creating CameraEvent records.
   * 
   * SECURITY BOUNDARY:
   * This method uses the authoritative tenantId established by the caller,
   * NOT arbitrary job payloads.
   */
  static async processVisionDetections(
    authoritativeTenantId: string,
    cameraId: string,
    untrustedOutput: NormalizedDetection[],
    confidenceThreshold: number = 0.6
  ): Promise<string[]> {
    
    // 1. Validate Untrusted Provider Output
    const validationResult = VisionOutputSchema.safeParse(untrustedOutput);
    
    if (!validationResult.success) {
      Logger.warn('[CameraEventService] Invalid vision provider output', { 
        cameraId,
        error: validationResult.error.format()
      });
      throw new Error('MALFORMED_VISION_OUTPUT');
    }

    const detections = validationResult.data;
    
    // 2. Filter by threshold
    const actionableDetections = detections.filter(d => d.confidence >= confidenceThreshold);
    
    if (actionableDetections.length === 0) {
      return []; // Nothing to report
    }

    // 3. Create Camera Events using Authoritative Tenant Context
    const createdEventIds: string[] = [];
    
    for (const detection of actionableDetections) {
      const created = await withTenant(authoritativeTenantId).cameraEvent.create({
        data: {
          tenantId: authoritativeTenantId,
          cameraId: cameraId,
          eventType: detection.eventType as CameraEventType,
          severity: 'INFO', // Default for now
          metadata: {
            ...detection.metadata,
            confidence: detection.confidence,
            source: 'VISION_INFERENCE'
          },
          timestamp: detection.timestamp
        }
      });
      createdEventIds.push(created.id);
      
      Logger.info(`[CameraEventService] Created CameraEvent ${created.id}`, {
        cameraId,
        eventType: detection.eventType
      });
    }

    return createdEventIds;
  }
}
