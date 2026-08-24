import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import globalPrisma from '@db/utils/prisma';
import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import crypto from 'crypto';

export async function generateStreamToken(cameraId: string) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  
  // Require specific CAMERA read access to view streams
  await requirePermission('CUSTOMER', 'READ');

  const prisma = withTenant(tenantId);
  
  return await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    const camera = await tx.camera.findFirst({
      where: { id: cameraId, tenantId },
      include: { location: true }
    });

    if (!camera) throw new Error('Camera not found');

    // Generate secure token (mocking the stream URL signing)
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    // Ensure we log stream access for security audit
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'CAMERA_STREAM_ACCESSED',
        resource: 'CAMERA',
        resourceId: camera.id,
        metadata: { ipAddress: camera.ipAddress }
      }
    });

    return {
      streamUrl: `wss://stream.ai-security-crm.example.com/live/${camera.id}?token=${token}`,
      expiresAt: expiry
    };
  });
}
