import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import { CreateCameraInput, UpdateCameraInput, SimulateAIEventInput } from './cctv.types';
import { assertRelationOwnership } from '@/lib/security/tenant-guard';
import globalPrisma from '@db/utils/prisma';

export async function createCamera(input: CreateCameraInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  // Using SYSTEM config permission for camera operations for now, or CUSTOMER since it's linked to location
  // Let's use CUSTOMER permission for simplicity matching the CRM
  await requirePermission('CUSTOMER', 'UPDATE');

  await assertRelationOwnership([{ model: 'location', id: input.locationId }], tenantId);

  const prisma = withTenant(tenantId);

  return await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    // Fetch location for logging
    const location = await tx.location.findFirst({ where: { id: input.locationId, tenantId }});
    if (!location) throw new Error("Location not found");

    const camera = await tx.camera.create({
      data: {
        tenantId,
        locationId: input.locationId,
        name: input.name,
        ipAddress: input.ipAddress,
        protocol: input.protocol,
        model: input.model,
        manufacturer: input.manufacturer,
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'CAMERA_CREATED',
        resource: 'CUSTOMER', // Mapping to customer due to schema
        resourceId: location.customerId,
        metadata: { cameraId: camera.id, name: camera.name }
      }
    });

    await tx.activityTimeline.create({
      data: {
        tenantId,
        type: 'SYSTEM',
        content: `Added new camera: ${camera.name} at location ${location.name}`,
        actorId: user.id,
        entityType: 'CUSTOMER',
        entityId: location.customerId
      }
    });

    return camera;
  });
}

export async function getCameras() {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'READ');

  const prisma = withTenant(tenantId);
  return await prisma.camera.findMany({
    include: { location: true }
  });
}

export async function getCameraById(id: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'READ');

  const prisma = withTenant(tenantId);
  return await prisma.camera.findFirst({
    where: { id, tenantId },
    include: { location: true }
  });
}

export async function updateCamera(input: UpdateCameraInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'UPDATE');

  if (input.locationId) {
    await assertRelationOwnership([{ model: 'location', id: input.locationId }], tenantId);
  }

  const prisma = withTenant(tenantId);

  return await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    const camera = await tx.camera.findFirst({ where: { id: input.id, tenantId }, include: { location: true }});
    if (!camera) throw new Error('Camera not found');

    await tx.camera.update({
      where: { id: input.id },
      data: {
        name: input.name,
        locationId: input.locationId,
        ipAddress: input.ipAddress,
        protocol: input.protocol,
        model: input.model,
        manufacturer: input.manufacturer,
        status: input.status,
      }
    });

    if (camera.location) {
      await tx.activityTimeline.create({
        data: {
          tenantId,
          type: 'SYSTEM',
          content: `Updated camera: ${input.name || camera.name}`,
          actorId: user.id,
          entityType: 'CUSTOMER',
          entityId: camera.location.customerId
        }
      });
    }

    return tx.camera.findFirst({ where: { id: input.id, tenantId }});
  });
}

export async function deleteCamera(id: string) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'UPDATE');

  const prisma = withTenant(tenantId);

  return await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    const camera = await tx.camera.findFirst({ where: { id, tenantId }, include: { location: true } });
    if (!camera) throw new Error('Camera not found');

    await tx.camera.delete({ where: { id } });

    if (camera.location) {
      await tx.activityTimeline.create({
        data: {
          tenantId,
          type: 'SYSTEM',
          content: `Deleted camera: ${camera.name}`,
          actorId: user.id,
          entityType: 'CUSTOMER',
          entityId: camera.location.customerId
        }
      });
    }

    return { success: true };
  });
}

export async function simulateAIEvent(input: SimulateAIEventInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'UPDATE');

  const prisma = withTenant(tenantId);

  const result = await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    const camera = await tx.camera.findFirst({ where: { id: input.cameraId, tenantId }, include: { location: true } });
    if (!camera) throw new Error('Camera not found');

    const aiEvent = await tx.aIEvent.create({
      data: {
        tenantId,
        cameraId: camera.id,
        model: 'simulated-demo-model',
        confidence: input.confidence,
        detectedObject: input.detectedObject,
      }
    });

    // Determine severity mapping
    let severity: any = 'LOW';
    const obj = input.detectedObject.toLowerCase();
    if (obj.includes('person')) {
      severity = 'HIGH';
    } else if (obj.includes('vehicle')) {
      severity = 'MEDIUM';
    } else if (obj.includes('restricted') || obj.includes('intrusion')) {
      severity = 'CRITICAL';
    }

    const title = `Security Alert: ${input.detectedObject}`;
    let incident = null;

    if (camera.location) {
      incident = await tx.incident.create({
        data: {
          tenantId,
          locationId: camera.locationId!,
          cameraId: camera.id,
          aiEventId: aiEvent.id,
          title,
          severity,
          status: 'OPEN',
        }
      });

      await tx.activityTimeline.create({
        data: {
          tenantId,
          type: 'SYSTEM',
          content: `${title} [${severity}] at ${camera.name} (${Math.round(input.confidence * 100)}% confidence)`,
          actorId: user.id,
          entityType: 'CUSTOMER',
          entityId: camera.location.customerId
        }
      });
    }

    return { aiEvent, incidentId: incident?.id };
  });

  if (result.incidentId) {
    import('../communication/notification.service').then(({ NotificationService }) => {
      NotificationService.createNotification(tenantId, user.id, 'ALERT', 'Camera AI Event', 'AI detected a significant event.').catch(console.error);
    });
  }

  return result.aiEvent;
}
