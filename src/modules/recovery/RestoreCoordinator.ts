// import { prismaAdmin } from '@db/utils/prisma'; (removed)
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { KeyManagementService } from './security/KeyManagementService';
import crypto from 'crypto';
import zlib from 'zlib';
import { PassThrough, Transform } from 'stream';
import { getStorageProvider } from '@/../src/lib/storage';
import { JobQueueProvider } from '@/../src/lib/queue/JobQueueProvider';
import { BullMQProvider } from '@/../src/lib/queue/BullMQProvider';

// Map models exactly as per the dependency graph
const RESTORE_PHASES = [
  'Role', 'User', 'UserRole', 'DeviceSession', // Access Control
  'Location', 'Customer', 'CustomerContact', 'Lead', 'Task', 'ActivityTimeline', // CRM Core
  'Camera', 'CameraCredential', 'CameraStream', 'Recording', 'AIEvent', 'Incident', // CCTV
  'Conversation', 'Message', 'MessageAttachment', 'Call', 'CallParticipant', 'CallRecording', // Communication
  'PaymentCustomer', 'Subscription', 'Invoice', 'Payment', 'UsageEvent', // Billing
  'TenantIntegration', 'WebhookEvent' // Hooks
];

const CHUNK_SIZE = parseInt(process.env.RESTORE_CHUNK_SIZE || '10000', 10);

export class RestoreCoordinator {
  private queue: JobQueueProvider;

  constructor() {
    this.queue = new BullMQProvider();
  }

  async requestRestore(tenantId: string, archiveLocation: string, requestorUserId: string): Promise<string> {
    // 1. Authorize: Coordinator must ensure requestor is the owner.
    const tenant = await executeAsSystem(SystemOperation.PLATFORM_CRON, async (tx) => tx.tenant.findUnique({ where: { id: tenantId } }));
    if (!tenant) throw new Error('Tenant not found');
    if (tenant.ownerId !== requestorUserId) {
      throw new Error('Unauthorized: Only the tenant owner can initiate a disaster recovery restore.');
    }

    // 2. Resolve Archive Identity
    const uri = new URL(archiveLocation);
    const query = new URLSearchParams(uri.search);
    const jobIdParam = query.get('job');
    if (!jobIdParam) throw new Error('Invalid archive location format');

    const latestJob = await executeAsSystem(SystemOperation.PLATFORM_CRON, async (tx) => tx.recoveryJob.findFirst({
      where: { tenantId, status: 'IN_PROGRESS' },
      orderBy: { createdAt: 'desc' }
    }));

    const job = await executeAsSystem(SystemOperation.PLATFORM_CRON, async (tx) => tx.recoveryJob.findUnique({
      where: { id: jobIdParam }
    }));

    if (!job || !job.snapshotId) {
      throw new Error('No matching job or snapshot found');
    }

    const snapshot = await executeAsSystem(SystemOperation.PLATFORM_CRON, async (tx) => tx.recoverySnapshot.findUnique({
      where: { id: job.snapshotId as string, status: 'ACTIVE' }
    }));

    if (!snapshot) {
      throw new Error('Checksum validation failed: No matching snapshot found');
    }

    // 3. Prevent Concurrent restores
    if (tenant.isRestoreLocked) {
      throw new Error('Tenant is currently locked for an active restore.');
    }

    // 4. Lock Tenant and Transition State
    const restoreJobId = crypto.randomUUID();
    await executeAsSystem(SystemOperation.PLATFORM_CRON, async (tx) => {
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, tenantId);
      await tx.tenant.update({
        where: { id: tenantId },
        data: { isRestoreLocked: true }
      });
      await tx.recoveryJob.create({
        data: {
          id: restoreJobId,
          tenantId,
          requestedBy: requestorUserId,
          status: 'QUEUED' as any,
          mode: 'RESTORE' as any,
          snapshotId: snapshot.id
        }
      });
    });

    // 5. Generate deterministic chunk identities and push to Queue
    // Instead of pushing chunks blindly, we push a single Phase coordinator job to evaluate stream chunking
    await this.queue.enqueue({
      jobId: restoreJobId,
      type: 'RESTORE',
      tenantId,
      requestedBy: requestorUserId,
      metadata: {
        snapshotId: snapshot.id,
        archiveLocation,
        phaseIndex: 0
      }
    });

    return restoreJobId;
  }
}
