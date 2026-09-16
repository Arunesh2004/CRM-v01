import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { withTenant } from '@db/utils/prisma-tenant';
import { getStorageProvider } from '../../../lib/storage';
import { Logger } from '@/lib/logger/logger';

 
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
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
    const toDelete: any[] = [];
    
    // Step 1: Identify all snapshots to delete in a single bounded system transaction
    await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => {
      const tenants = await tx.tenant.findMany({
        where: { status: { not: 'DELETED' } },
        select: { id: true, rpoPolicy: true }
      });

      const allActiveSnapshots = await tx.recoverySnapshot.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, tenantId: true, checksum: true }
      });

      const snapshotsByTenant = new Map<string, any[]>();
      for (const s of allActiveSnapshots) {
        if (!snapshotsByTenant.has(s.tenantId)) snapshotsByTenant.set(s.tenantId, []);
        snapshotsByTenant.get(s.tenantId)!.push(s);
      }

      for (const tenant of tenants) {
        let keepCount = 7; // Default Basic
        if (tenant.rpoPolicy === 'ENTERPRISE') keepCount = 30;
        if (tenant.rpoPolicy === 'BUSINESS') keepCount = 14;

        const snapshots = snapshotsByTenant.get(tenant.id) || [];
        if (snapshots.length > keepCount) {
          toDelete.push(...snapshots.slice(keepCount));
        }
      }
    });

    // Step 2: Perform external deletions safely outside the global transaction lock
    for (const snapshot of toDelete) {
      await this.deleteSnapshotSafely(snapshot);
    }
  }

  /**
   * Evaluates and prunes old snapshots for a single tenant manually.
   * Never deletes the most recent successful snapshot.
   */
  async enforceTenantRetention(tenantId: string): Promise<void> {
    let keepCount = 7; // Default Basic
    
    // Scoped local query for manual execution
    const toDelete = await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => {
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { rpoPolicy: true } });
      if (tenant?.rpoPolicy === 'ENTERPRISE') keepCount = 30;
      if (tenant?.rpoPolicy === 'BUSINESS') keepCount = 14;

      const snapshots = await tx.recoverySnapshot.findMany({
        where: { tenantId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, tenantId: true, checksum: true }
      });

      if (snapshots.length <= keepCount) return [];
      return snapshots.slice(keepCount);
    });

    for (const snapshot of toDelete) {
      await this.deleteSnapshotSafely(snapshot);
    }
  }

  /**
   * Safely deletes a snapshot:
   * 1. Marks DELETE_PENDING atomically
   * 2. Audit record
   * 3. Deletes object storage
   * 4. Deletes DB metadata (or marks DELETED)
   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  async deleteSnapshotSafely(snapshot: any, isRetry = false): Promise<void> {
    const storage = getStorageProvider();
    const tenantPrisma = withTenant(snapshot.tenantId);

    // 1. Mark DELETE_PENDING atomically to avoid TOCTOU races with other retention workers
    // Prisma does not return the updated row on updateMany, but it returns the count.
    const updateResult = await tenantPrisma.recoverySnapshot.updateMany({
      where: { 
        id: snapshot.id, 
        status: isRetry ? 'DELETE_PENDING' : 'ACTIVE' 
      },
      data: { status: 'DELETE_PENDING' }
    });

    if (updateResult.count === 0 && !isRetry) {
      // Snapshot was already transitioned (e.g. by another concurrent worker)
      return;
    }

    // We need to extract the objectKey from the checksum/id, but actually we need the `RecoveryJob` that created it to get the `archiveLocation`.
    // We don't have a direct link from RecoverySnapshot -> Job right now in the schema.
    // Let's find the job by checksum.
    const job = await tenantPrisma.recoveryJob.findFirst({
      where: { tenantId: snapshot.tenantId, checksum: snapshot.checksum, status: 'COMPLETED' }
    });

    if (!job || !job.archiveLocation) {
      // If we can't find the file location, just mark it as DELETED to clean up the DB
      await tenantPrisma.recoverySnapshot.update({
        where: { id: snapshot.id },
        data: { status: 'DELETED' }
      });
      return;
     
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
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
      await tenantPrisma.recoverySnapshot.update({
        where: { id: snapshot.id },
        data: { status: 'DELETED' }
      });

      await tenantPrisma.recoveryAuditLog.create({
        data: {
          tenantId: snapshot.tenantId,
          jobId: job.id,
          action: 'SNAPSHOT_RETENTION_DELETED',
          actorId: 'SYSTEM',
          metadata: { snapshotId: snapshot.id }
        }
      });
    } catch (eRaw: unknown) {
      const e = eRaw instanceof Error ? eRaw : new Error(String(eRaw));
      // Failsafe: leave in DELETE_PENDING, DO NOT delete database metadata.
      await tenantPrisma.recoveryAuditLog.create({
        data: {
          tenantId: snapshot.tenantId,
          jobId: job.id,
          action: 'RETENTION_DELETION_FAILED',
          actorId: 'SYSTEM',
          metadata: { snapshotId: snapshot.id, error: e.message }
        }
      });
      Logger.error('Failed to delete snapshot from storage:', e);
    }
  }

  /**
   * Resumes failed deletions (DELETE_PENDING)
   */
  async retryPendingDeletions(): Promise<void> {
    const pending = await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => tx.recoverySnapshot.findMany({
      where: { status: 'DELETE_PENDING' }
    }));

    for (const snapshot of pending) {
      await this.deleteSnapshotSafely(snapshot, true);
    }
  }
}
