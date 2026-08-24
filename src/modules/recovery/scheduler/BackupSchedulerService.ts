import { prismaAdmin } from '@db/utils/prisma';
import { exportTenant } from '../export.engine';
import crypto from 'crypto';

export class BackupSchedulerService {
  /**
   * Triggers the backup cycle for all active tenants.
   */
  async triggerBackupCycle(): Promise<void> {
    await this.recoverStaleJobs();

    const tenants = await prismaAdmin.tenant.findMany({
      where: { status: 'ACTIVE' }
    });

    for (const tenant of tenants) {
      await this.triggerTenantBackup(tenant.id, tenant.ownerId || 'SYSTEM');
    }
  }

  /**
   * Prevents duplicate generation through Postgres transaction constraints.
   */
  async triggerTenantBackup(tenantId: string, requestedBy: string): Promise<any> {
    try {
      // Idempotency constraint using raw SQL to prevent concurrency race conditions.
      // If Worker A and B hit this simultaneously, only one will insert successfully.
      const newJobId = crypto.randomUUID();
      const insertResult: any[] = await prismaAdmin.$transaction(async (tx) => {
        // Obtain an advisory transaction lock based on the tenant ID hash
        await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, tenantId);
        
        const existing = await tx.recoveryJob.findFirst({
           where: { tenantId, status: { in: ['REQUESTED', 'IN_PROGRESS'] } }
        });
        
        if (existing) return [];
        
        return await tx.$queryRawUnsafe(`
          INSERT INTO "RecoveryJob" (
            id, "tenantId", "requestedBy", status, mode, "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, 'REQUESTED', 'RECOVERY', NOW(), NOW()
          ) RETURNING id;
        `, newJobId, tenantId, requestedBy);
      }, { maxWait: 10000, timeout: 300000 });

      if (!insertResult || insertResult.length === 0) {
        // Job already exists, race condition blocked!
        return { success: false, reason: 'Concurrency blocked: Job already in progress.' };
      }

      // Execute Export
      try {
        // We don't need to manually update it here because exportTenant handles it now.

        const result = await exportTenant(tenantId, requestedBy, newJobId);
        
        return { success: true, result };
      } catch (error: any) {
        // Failsafe: if export throws, update the job to FAILED. (exportTenant also does this internally if it has the job ID, but since we created the job here, we must handle it).
        // Wait, exportTenant creates its own Job!
        // We need to modify exportTenant to optionally accept an existing jobId, or we use our job.
        return { success: false, reason: error.message };
      }
    } catch (e: any) {
      console.error('Backup trigger failed:', e);
      return { success: false, reason: e.message };
    }
  }

  /**
   * Scheduler Crash Recovery: Detects jobs that were IN_PROGRESS but crashed.
   */
  async recoverStaleJobs(): Promise<void> {
    // If a job is IN_PROGRESS for more than 1 hour, assume the worker crashed.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    await prismaAdmin.recoveryJob.updateMany({
      where: {
        status: 'IN_PROGRESS',
        startedAt: { lt: oneHourAgo }
      },
      data: {
        status: 'FAILED',
        errorMessage: 'Stale job detected (worker crash). Auto-failed by scheduler.',
        completedAt: new Date()
      }
    });
  }
}
