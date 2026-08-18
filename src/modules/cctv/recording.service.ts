import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import globalPrisma from '@/../database/utils/prisma';
import { withTenant, withTenantTransaction } from '@/../database/utils/prisma-tenant';
import crypto from 'crypto';

export async function getCameraRecordings(cameraId: string, limit: number = 50, cursor?: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'READ');

  const prisma = withTenant(tenantId);
  const recordings = await prisma.recording.findMany({
    where: { tenantId, cameraId },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { startTime: 'desc' }
  });

  const hasMore = recordings.length > limit;
  const data = hasMore ? recordings.slice(0, -1) : recordings;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, hasMore, nextCursor };
}

export async function generateRecordingDownloadUrl(recordingId: string) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'READ');

  const prisma = withTenant(tenantId);
  
  return await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    const recording = await tx.recording.findFirst({
      where: { id: recordingId, tenantId },
      include: { camera: true }
    });

    if (!recording) throw new Error('Recording not found');

    // Create a time-limited signed URL token
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'CAMERA_RECORDING_DOWNLOADED',
        resource: 'CAMERA',
        resourceId: recording.cameraId,
        metadata: { recordingId: recording.id, sizeBytes: recording.sizeBytes }
      }
    });

    return {
      downloadUrl: `https://storage.ai-security-crm.example.com/recordings/${recording.storageKey}?token=${token}`,
      expiresAt: expiry
    };
  });
}
