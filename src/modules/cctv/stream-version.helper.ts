import { deriveOpaquePath } from './stream.service';
import { ENV } from '@/lib/config/env';

/**
 * Centralized logic for invalidating a camera stream generation.
 * Any mutation that affects stream configuration (credentials, IP, protocol, authMode)
 * must invoke this within the same Prisma transaction.
 * 
 * This conceptually does:
 * 1. Increment streamVersion (row-level lock)
 * 2. Create durable outbox record (CameraStreamInvalidation)
 */
export async function invalidateCurrentStreamGeneration(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  tx: any, 
  tenantId: string, 
  cameraId: string, 
  currentStreamVersion: number
): Promise<string> {
  // Derive the opaque path of the OLD generation that we are invalidating
  const oldOpaquePath = deriveOpaquePath(tenantId, cameraId, currentStreamVersion);

  // 1. Increment the version to invalidate future connections
  await tx.camera.update({
    where: { id: cameraId },
    data: { streamVersion: { increment: 1 } }
  });

  // 2. Create durable invalidation outbox record for active session termination
  await tx.cameraStreamInvalidation.create({
    data: {
      cameraId,
      tenantId,
      streamVersion: currentStreamVersion,
      opaquePath: oldOpaquePath,
      status: 'PENDING'
    }
  });

  return oldOpaquePath;
}

/**
 * Attempts immediate deletion of the old MediaMTX path.
 * If this fails, the durable background worker will pick it up.
 */
export async function attemptImmediateInvalidation(opaquePath: string) {
  if (!ENV.cctvEnabled) return;
  try {
    const mediamtxUrl = ENV.mediamtxApiUrl;
    await fetch(`${mediamtxUrl}/v3/config/paths/delete/${opaquePath}`, {
      method: 'DELETE'
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
    }).catch(() => {});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
  } catch (err) {
    // We intentionally swallow errors here. The durable worker handles retry.
  }
}
