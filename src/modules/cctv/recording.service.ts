import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import globalPrisma from '@db/utils/prisma';
import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import { generateSignedDownloadUrl } from '@/lib/providers/storage/s3.provider';

export async function getCameraRecordings(cameraId: string, limit: number = 50, cursor?: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('RECORDING', 'READ');

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
  await requirePermission('RECORDING', 'READ');

   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  const prisma = withTenant(tenantId);

 

   
  return await globalPrisma.$transaction(async (baseTx) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    const recording = await tx.recording.findFirst({
      where: { id: recordingId, tenantId },
      include: { camera: true }
    });

    if (!recording) throw new Error('Recording not found');

    // Create a time-limited signed URL using the real S3 provider
    const downloadUrl = await generateSignedDownloadUrl(recording.storageKey, 3600);
    const expiry = new Date(Date.now() + 3600 * 1000);

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
      downloadUrl,
      expiresAt: expiry
    };
  });
}
