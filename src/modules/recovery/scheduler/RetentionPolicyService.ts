import { prismaAdmin } from '@/../database/utils/prisma';
import { getStorageProvider } from '../../../lib/storage';

const POLICY_LIMITS: Record<string, number> = {
  DAILY: 7,
  WEEKLY: 4,
  MONTHLY: 12
};

export class RetentionPolicyService {
  /**
   * Enforces retention policies for all tenants based on their settings.
   */
  async enforceRetentionPolicies(): Promise<void> {
    const tenants = await prismaAdmin.tenant.findMany({
      where: { status: { not: 'DELETED' } },
      select: { id: true, rpoPolicy: true }
    });

    for (const tenant of tenants) {
      await this.enforceTenantRetention(tenant.id);
    }
  }

  /**
   * Evaluates and prunes old snapshots for a single tenant.
   * Never deletes the most recent successful snapshot.
   */
  async enforceTenantRetention(tenantId: string): Promise<void> {
    // For simplicity, we just implement a flat N-count retention policy per tenant
    // based on their RPO tier. 
    // ENTERPRISE = keep 30, BUSINESS = keep 14, BASIC = keep 7
    let keepCount = 7; // Default Basic
    const tenant = await prismaAdmin.tenant.findUnique({ where: { id: tenantId } });
    if (tenant?.rpoPolicy === 'ENTERPRISE') keepCount = 30;
    if (tenant?.rpoPolicy === 'BUSINESS') keepCount = 14;

    const snapshots = await prismaAdmin.recoverySnapshot.findMany({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' }
    });

    // If we have fewer snapshots than the limit, do nothing.
    if (snapshots.length <= keepCount) {
      return;
    }

    // The first `keepCount` snapshots are safe. The rest are to be deleted.
    const toDelete = snapshots.slice(keepCount);

    for (const snapshot of toDelete) {
      await this.deleteSnapshotSafely(snapshot);
    }
  }

  /**
   * Safely deletes a snapshot:
   * 1. Marks DELETE_PENDING
   * 2. Audit record
   * 3. Deletes object storage
   * 4. Deletes DB metadata (or marks DELETED)
   */
  async deleteSnapshotSafely(snapshot: any): Promise<void> {
    const storage = getStorageProvider();

    // 1. Mark DELETE_PENDING
    await prismaAdmin.recoverySnapshot.update({
      where: { id: snapshot.id },
      data: { status: 'DELETE_PENDING' }
    });

    // We need to extract the objectKey from the checksum/id, but actually we need the `RecoveryJob` that created it to get the `archiveLocation`.
    // We don't have a direct link from RecoverySnapshot -> Job right now in the schema.
    // Let's find the job by checksum.
    const job = await prismaAdmin.recoveryJob.findFirst({
      where: { tenantId: snapshot.tenantId, checksum: snapshot.checksum, status: 'COMPLETED' }
    });

    if (!job || !job.archiveLocation) {
      // If we can't find the file location, just mark it as DELETED to clean up the DB
      await prismaAdmin.recoverySnapshot.update({
        where: { id: snapshot.id },
        data: { status: 'DELETED' }
      });
      return;
    }

    const [uri, query] = job.archiveLocation.split('?');
    let objectKey = '';
    
    if (uri.startsWith('local://')) {
      objectKey = uri.replace('local://', '').split('/')[1]; // format: local://tenantId/objectKey
    } else if (uri.startsWith('s3://')) {
      // s3://bucket/tenants/tenantId/recovery/objectKey
      const parts = uri.split('/');
      objectKey = parts[parts.length - 1];
    } else {
      // Unknown
      return;
    }

    try {
      // 3. Delete Object Storage
      const exists = await storage.verifyObjectExists(snapshot.tenantId, objectKey);
      if (exists) {
        await storage.deleteObject(snapshot.tenantId, objectKey);
      }
      
      // 4. Update DB
      await prismaAdmin.recoverySnapshot.update({
        where: { id: snapshot.id },
        data: { status: 'DELETED' }
      });

      await prismaAdmin.recoveryAuditLog.create({
        data: {
          tenantId: snapshot.tenantId,
          jobId: job.id,
          action: 'SNAPSHOT_RETENTION_DELETED',
          actorId: 'SYSTEM',
          metadata: { snapshotId: snapshot.id }
        }
      });
    } catch (e: any) {
      // Failsafe: leave in DELETE_PENDING, DO NOT delete database metadata.
      await prismaAdmin.recoveryAuditLog.create({
        data: {
          tenantId: snapshot.tenantId,
          jobId: job.id,
          action: 'RETENTION_DELETION_FAILED',
          actorId: 'SYSTEM',
          metadata: { snapshotId: snapshot.id, error: e.message }
        }
      });
      console.error('Failed to delete snapshot from storage:', e);
    }
  }

  /**
   * Resumes failed deletions (DELETE_PENDING)
   */
  async retryPendingDeletions(): Promise<void> {
    const pending = await prismaAdmin.recoverySnapshot.findMany({
      where: { status: 'DELETE_PENDING' }
    });

    for (const snapshot of pending) {
      await this.deleteSnapshotSafely(snapshot);
    }
  }
}
