import { Logger } from '@/lib/logger/logger';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import { CreateCameraInput, UpdateCameraInput, SimulateAIEventInput } from './cctv.types';
import { requireRelationOwnership } from '@/lib/auth/relation-auth';
import globalPrisma from '@db/utils/prisma';
import { encrypt } from '@/lib/encryption';
import { ENV } from '@/lib/config/env';
import { invalidateStreamAccess, deriveOpaquePath } from './stream.service';
import { invalidateCurrentStreamGeneration, attemptImmediateInvalidation } from './stream-version.helper';
export async function createCamera(input: CreateCameraInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  // Using SYSTEM config permission for camera operations for now, or CUSTOMER since it's linked to location
  // Let's use CUSTOMER permission for simplicity matching the CRM
  await requirePermission('CUSTOMER', 'UPDATE');

  const prisma = withTenant(tenantId);

  return await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    
    await requireRelationOwnership(tx, tenantId, {
      location: input.locationId
    });

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
        authMode: input.authMode,
        model: input.model,
        manufacturer: input.manufacturer,
      }
    });

    if (input.rtspUsername && input.rtspPassword) {
      await tx.cameraCredential.create({
        data: {
          tenantId,
          cameraId: camera.id,
          encryptedUsername: encrypt(input.rtspUsername),
          encryptedPassword: encrypt(input.rtspPassword),
        }
      });
    }

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
  const cameras = await prisma.camera.findMany({
    where: { deletedAt: null },
    include: { location: true, credential: { select: { id: true } } }
  });

  return cameras.map(c => {
    const { credential, ...rest } = c;
    return { ...rest, hasCredentials: !!credential };
  });
}

export async function getCameraById(id: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'READ');

  const prisma = withTenant(tenantId);
  const camera = await prisma.camera.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: { location: true, credential: { select: { id: true } } }
  });

  if (!camera) return null;
  const { credential, ...rest } = camera;
  return { ...rest, hasCredentials: !!credential };
}

export async function updateCamera(input: UpdateCameraInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'UPDATE');



  const prisma = withTenant(tenantId);

  const oldCameraForInvalidation: any = null;

  const result = await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    
    if (input.locationId) {
      await requireRelationOwnership(tx, tenantId, { location: input.locationId });
    }

    const camera = await tx.camera.findFirst({ where: { id: input.id, tenantId, deletedAt: null }, include: { location: true, credential: true }});
    if (!camera) throw new Error('Camera not found');

    const needsInvalidation = 
      (input.authMode !== undefined && input.authMode !== camera.authMode) ||
      (input.ipAddress !== undefined && input.ipAddress !== camera.ipAddress) ||
      (input.protocol !== undefined && input.protocol !== camera.protocol);

    if (input.authMode === 'NONE' && camera.authMode === 'PASSWORD') {
      await tx.cameraCredential.deleteMany({ where: { cameraId: input.id } });
    }

    let stalePath: string | null = null;
    if (needsInvalidation) {
      stalePath = await invalidateCurrentStreamGeneration(tx, tenantId, camera.id, camera.streamVersion);
    }

    await tx.camera.update({
      where: { id: input.id },
      data: {
        name: input.name,
        locationId: input.locationId,
        ipAddress: input.ipAddress,
        protocol: input.protocol,
        authMode: input.authMode,
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

    const updatedCamera = await tx.camera.findFirst({ 
      where: { id: input.id, tenantId },
      include: { credential: { select: { id: true } } }
    });
    
    if (updatedCamera) {
      const { credential, ...rest } = updatedCamera;
      return { camera: { ...rest, hasCredentials: !!credential }, stalePath };
    }
    return { camera: null, stalePath };
  });

  if (result.stalePath) {
    attemptImmediateInvalidation(result.stalePath);
  }

  return result.camera;
}

export async function deleteCamera(id: string) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'UPDATE');

  const prisma = withTenant(tenantId);

    const result = await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    
    // 1. Read active camera row inside transaction
    const camera = await tx.camera.findFirst({ 
      where: { id, tenantId, deletedAt: null }, 
      include: { location: true } 
    });
    
    if (!camera) {
      // Return idempotent success if it's already soft-deleted
      const existing = await tx.camera.findFirst({ where: { id, tenantId } });
      if (existing && existing.deletedAt) {
        return { success: true, stalePath: null, idempotent: true };
      }
      throw new Error('Camera not found');
    }

    // 2. Atomically transition deletedAt: NULL -> timestamp checking affectedRows
    const updateRes = await tx.camera.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() }
    });

    if (updateRes.count !== 1) {
      // Another concurrent request beat us to it
      return { success: true, stalePath: null, idempotent: true };
    }

    // 3. Derive stale path from the exact pre-deletion stream generation
    const stalePath = deriveOpaquePath(tenantId, camera.id, camera.streamVersion);

    // 4. Upsert invalidation job
    await tx.cameraStreamInvalidation.upsert({
      where: {
        cameraId_streamVersion: { cameraId: camera.id, streamVersion: camera.streamVersion }
      },
      update: {},
      create: {
        cameraId: camera.id,
        tenantId,
        streamVersion: camera.streamVersion,
        opaquePath: stalePath,
        status: 'PENDING'
      }
    });

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

    return { success: true, stalePath, idempotent: false }; 
  });

  if (result.stalePath) {
    // Force-sweep MediaMTX paths immediately (best-effort)
    try {
      const prefix = `c_${tenantId}_${id}_`;
      const res = await fetch(`${ENV.mediamtxApiUrl}/v3/config/paths/list?search=${prefix}`);
      if (res.ok) {
        const data = await res.json();
        if (data.items) {
          for (const item of data.items) {
            if (item.name && item.name.startsWith(prefix)) {
              await fetch(`${ENV.mediamtxApiUrl}/v3/config/paths/delete/${item.name}`, { method: 'DELETE' }).catch(() => {});
            }
          }
        }
      }
    } catch (err) {
      Logger.warn('[MediaMTX] Force cleanup failed for deleted camera', { id, error: (err as any).message });
    }
  }

  return result;
}

export async function simulateAIEvent(input: SimulateAIEventInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'UPDATE');

  const prisma = withTenant(tenantId);

  const result = await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    const camera = await tx.camera.findFirst({ where: { id: input.cameraId, tenantId, deletedAt: null }, include: { location: true } });
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

    // Create EventOutbox in the same transaction for async processing
    await tx.eventOutbox.create({
      data: {
        tenantId,
        eventId: aiEvent.id, // using aiEvent.id as unique eventId for idempotency and correlation
        eventType: 'CCTV.AI_EVENT.DETECTED',
        payload: {
          aiEventId: aiEvent.id,
          cameraId: camera.id,
          detectedObject: input.detectedObject,
          confidence: input.confidence,
          actorId: user.id
        }
      }
    });

    return { aiEvent };
  });

  return result.aiEvent;
}

export async function setCameraCredentials(cameraId: string, rtspUsername: string, rtspPassword: string) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'UPDATE');
  const result = await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    const camera = await tx.camera.findFirst({ where: { id: cameraId, tenantId, deletedAt: null }, include: { location: true, credential: true } });
    if (!camera) throw new Error('Camera not found');
    if (camera.authMode !== 'PASSWORD') throw new Error('Cannot set credentials for a camera with authMode NONE');

    const stalePath = await invalidateCurrentStreamGeneration(tx, tenantId, camera.id, camera.streamVersion);

    await tx.cameraCredential.upsert({
      where: { cameraId },
      create: {
        tenantId,
        cameraId,
        encryptedUsername: encrypt(rtspUsername),
        encryptedPassword: encrypt(rtspPassword),
      },
      update: {
        encryptedUsername: encrypt(rtspUsername),
        encryptedPassword: encrypt(rtspPassword),
      }
    });

    if (camera.location) {
      await tx.activityTimeline.create({
        data: {
          tenantId,
          type: 'SYSTEM',
          content: `Updated credentials for camera: ${camera.name}`,
          actorId: user.id,
          entityType: 'CUSTOMER',
          entityId: camera.location.customerId
        }
      });
    }

    return { success: true, stalePath };
  });

  if (result.stalePath) {
    attemptImmediateInvalidation(result.stalePath);
  }

  return { success: true };
}

export async function clearCameraCredentials(cameraId: string) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'UPDATE');
  const result = await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    const camera = await tx.camera.findFirst({ where: { id: cameraId, tenantId, deletedAt: null }, include: { location: true, credential: true } });
    if (!camera) throw new Error('Camera not found');

    const stalePath = await invalidateCurrentStreamGeneration(tx, tenantId, camera.id, camera.streamVersion);

    await tx.cameraCredential.deleteMany({
      where: { cameraId }
    });

    if (camera.location) {
      await tx.activityTimeline.create({
        data: {
          tenantId,
          type: 'SYSTEM',
          content: `Cleared credentials for camera: ${camera.name}`,
          actorId: user.id,
          entityType: 'CUSTOMER',
          entityId: camera.location.customerId
        }
      });
    }

    return { success: true, stalePath };
  });

  if (result.stalePath) {
    attemptImmediateInvalidation(result.stalePath);
  }

  return { success: true };
}
