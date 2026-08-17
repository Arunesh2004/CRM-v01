import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '../../../../database/utils/prisma-tenant';

export async function generateRecordingAccessUrl(recordingId: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  // Viewing a recording requires VIEW permission
  await requirePermission('COMMUNICATION', 'READ');
  const prisma = withTenant(tenantId);

  const recording = await prisma.communicationAttachment.findFirst({
    where: {
      id: recordingId,
      tenantId: tenantId,
      attachedToType: 'CALL'
    }
  });

  if (!recording) {
    throw new Error('Recording not found or access denied (tenant mismatch)');
  }

  // In a real environment, we would use AWS SDK to generate a presigned URL.
  // For the purpose of this simulation, we will return a simulated presigned URL.
  const tempToken = Math.random().toString(36).substring(7);
  const expiration = Date.now() + 15 * 60 * 1000; // 15 mins
  return `https://storage.provider.com/temp-access/${recording.id}?token=${tempToken}&expires=${expiration}`;
}
