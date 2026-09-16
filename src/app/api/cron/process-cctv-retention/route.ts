import { withApiContext } from '@/lib/observability/context';
import { Logger } from '@/lib/logger/logger';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import globalPrisma from '@db/utils/prisma';
import { deleteFile } from '@/lib/providers/storage/s3.provider';

const original_GET = async function (req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workerId = crypto.randomUUID();
  
  try {
    // 1. Schedule Expired Recordings
    // Prisma does not support joining effectively in a single update/insert query easily,
    // so we fetch tenants and their retention days, then find expired recordings.
    const tenants = await globalPrisma.tenant.findMany({
      select: { id: true, cctvRetentionDays: true }
    });

    let scheduledCount = 0;
    for (const tenant of tenants) {
      const expirationDate = new Date(Date.now() - tenant.cctvRetentionDays * 24 * 60 * 60 * 1000);
      
      const expiredRecordings = await globalPrisma.recording.findMany({
        where: {
          tenantId: tenant.id,
          createdAt: { lt: expirationDate },
        }
      });

      for (const rec of expiredRecordings) {
        try {
          await globalPrisma.retentionDeletionJob.create({
            data: {
              recordingId: rec.id,
              storageKey: rec.storageKey,
              status: 'PENDING'
            }
          });
          scheduledCount++;
        } catch (eRaw: unknown) {
           
          // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
          const e = eRaw instanceof Error ? eRaw : new Error(String(eRaw));
          // Ignore if exists
        }
      }
    }

    // 2. Claim and Process Jobs
    const claimedJobIdsResult = await globalPrisma.$queryRaw<{ id: string }[]>`
      UPDATE "RetentionDeletionJob"
      SET 
        status = 'PROCESSING', 
        "workerId" = ${workerId}, 
        "leaseExpiresAt" = NOW() + INTERVAL '5 minutes',
        "updatedAt" = NOW()
      WHERE id IN (
        SELECT id FROM "RetentionDeletionJob"
        WHERE 
          (status = 'PENDING')
          OR (status = 'RETRY_SCHEDULED' AND "nextAttemptAt" <= NOW())
          OR (status = 'PROCESSING' AND "leaseExpiresAt" <= NOW())
        ORDER BY "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 20
      )
      RETURNING id;
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    const claimedJobIds = claimedJobIdsResult.map((r: any) => r.id);
    let processedCount = 0;

    if (claimedJobIds.length > 0) {
      const jobs = await globalPrisma.retentionDeletionJob.findMany({
        where: { id: { in: claimedJobIds } }
      });

      for (const job of jobs) {
        try {
          // Idempotent deletion from S3
          await deleteFile(job.storageKey);

          // Delete DB Metadata
          await globalPrisma.recording.delete({
            where: { id: job.recordingId }
          }).catch(e => {
            if (e.code === 'P2025') {
              // Record already deleted
            } else {
              throw e;
            }
          });

          // Mark job complete
          const updateRes = await globalPrisma.retentionDeletionJob.updateMany({
            where: { id: job.id, workerId, status: 'PROCESSING' },
            data: { status: 'COMPLETED', workerId: null, leaseExpiresAt: null }
          });

          if (updateRes.count === 0) {
            throw new Error('Lease lost. Completion aborted.');
          }

          processedCount++;
        } catch (errRaw: unknown) {
          const err = errRaw instanceof Error ? errRaw : new Error(String(errRaw));
          Logger.error(`Retention Job ${job.id} failed:`, err);
          const attempts = job.attempts + 1;
          const maxAttempts = 5;
          const newStatus = attempts >= maxAttempts ? 'FAILED' : 'RETRY_SCHEDULED';
          const backoffMs = Math.pow(2, attempts) * 60000 + Math.random() * 30000;

          await globalPrisma.retentionDeletionJob.updateMany({
            where: { id: job.id, workerId, status: 'PROCESSING' },
            data: {
              status: newStatus,
              attempts,
              nextAttemptAt: new Date(Date.now() + backoffMs),
              workerId: null,
              leaseExpiresAt: null,
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true, scheduledCount, processedCount });
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    Logger.error('[Retention Worker Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiContext(original_GET);
