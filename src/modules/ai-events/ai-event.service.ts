import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import globalPrisma from '@db/utils/prisma';
import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import { EventBus } from '../core/events/event-bus';

export async function getAIEvents(params?: {
  cameraId?: string;
  limit?: number;
  cursor?: string;
}) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CAMERA', 'READ'); // Basic access

  const prisma = withTenant(tenantId);
  const limit = params?.limit || 50;

  const where: any = { tenantId };
  if (params?.cameraId) where.cameraId = params.cameraId;

  const events = await prisma.aIEvent.findMany({
    where,
    take: limit + 1,
    ...(params?.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    orderBy: { timestamp: 'desc' },
    include: { camera: true, incident: true }
  });

  const hasMore = events.length > limit;
  const data = hasMore ? events.slice(0, -1) : events;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, hasMore, nextCursor };
}

export async function ingestAIEventWebhook(payload: {
  tenantId: string;
  cameraId: string;
  model: string;
  confidence: number;
  detectedObject: string;
  metadata?: any;
}) {
  const prisma = withTenant(payload.tenantId);

  // Validate camera ownership
  const camera = await prisma.camera.findFirst({
    where: { id: payload.cameraId, tenantId: payload.tenantId },
    include: { location: true }
  });

  if (!camera) {
    throw new Error('Camera not found or does not belong to tenant');
  }

  return await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, payload.tenantId);
    // 1. Store the AI Event
    const aiEvent = await tx.aIEvent.create({
      data: {
        tenantId: payload.tenantId,
        cameraId: camera.id,
        model: payload.model,
        confidence: payload.confidence,
        detectedObject: payload.detectedObject,
        metadata: payload.metadata || {}
      }
    });

    // 2. Evaluate Severity
    let severity: any = 'LOW';
    const obj = payload.detectedObject.toLowerCase();
    
    if (obj.includes('person') || obj.includes('unauthorized')) {
      severity = 'HIGH';
    } else if (obj.includes('vehicle')) {
      severity = 'MEDIUM';
    }
    
    if (obj.includes('weapon') || obj.includes('intrusion')) {
      severity = 'CRITICAL';
    }

    // 3. Create Incident if severity is high/critical
    let incident = null;
    if ((severity === 'HIGH' || severity === 'CRITICAL') && camera.locationId) {
      incident = await tx.incident.create({
        data: {
          tenantId: payload.tenantId,
          locationId: camera.locationId,
          cameraId: camera.id,
          aiEventId: aiEvent.id,
          title: `AI Alert: ${payload.detectedObject}`,
          description: `Automatically generated incident from AI model ${payload.model} (Confidence: ${(payload.confidence * 100).toFixed(1)}%)`,
          severity: severity,
          status: 'OPEN'
        }
      });

      // Emit event for notification integration
      EventBus.emit('incident.created', {
        tenantId: payload.tenantId,
        incidentId: incident.id,
        severity: incident.severity,
        title: incident.title
      });
    }

    return { success: true, aiEventId: aiEvent.id, incidentId: incident?.id };
  });
}
