import { withApiContext } from '@/lib/observability/context';
import { Logger } from '@/lib/logger/logger';
import { NextRequest, NextResponse } from 'next/server';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { ENV } from '@/lib/config/env';

const original_GET = async function (req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!ENV.cctvEnabled) {
      return NextResponse.json({ success: true, message: 'CCTV module disabled' });
    }

    // 1. Recover stale PROCESSING jobs (stuck for > 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await executeAsSystem(SystemOperation.PLATFORM_CRON, async (tx) => {
      await tx.cameraStreamInvalidation.updateMany({
        where: {
          status: 'PROCESSING',
          updatedAt: { lt: fiveMinutesAgo }
        },
        data: {
          status: 'PENDING'
        }
      });
    });

    // 2. Fetch pending jobs that are ready to run
    const readyJobs = await executeAsSystem(SystemOperation.PLATFORM_CRON, async (tx) => {
      return tx.cameraStreamInvalidation.findMany({
        where: {
          status: 'PENDING',
          nextAttemptAt: { lte: new Date() }
        },
        take: 50,
        orderBy: { nextAttemptAt: 'asc' }
      });
    });

    if (readyJobs.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending invalidations' });
    }

    // 3. Atomically claim jobs
    const claimedJobs = [];
    for (const job of readyJobs) {
      const claimedCount = await executeAsSystem(SystemOperation.PLATFORM_CRON, async (tx) => {
        const claimed = await tx.cameraStreamInvalidation.updateMany({
          where: { id: job.id, status: 'PENDING' },
          data: { status: 'PROCESSING' }
        });
        return claimed.count;
      });
      if (claimedCount > 0) {
        claimedJobs.push(job);
      }
    }

    // 4. Process claimed jobs
    const mediamtxUrl = ENV.mediamtxApiUrl;
    let successCount = 0;
    let failCount = 0;

    for (const job of claimedJobs) {
      try {
        const response = await fetch(`${mediamtxUrl}/v3/config/paths/delete/${job.opaquePath}`, {
          method: 'DELETE'
        });

        if (response.ok || response.status === 404) {
          await executeAsSystem(SystemOperation.PLATFORM_CRON, async (tx) => {
            await tx.cameraStreamInvalidation.update({
              where: { id: job.id },
              data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                attempts: job.attempts + 1
              }
            });
          });
          successCount++;
        } else {
          throw new Error(`MediaMTX responded with status ${response.status}`);
        }
      } catch (errRaw: unknown) {
        const err = errRaw instanceof Error ? errRaw : new Error(String(errRaw));
        const attempts = job.attempts + 1;
        
        await executeAsSystem(SystemOperation.PLATFORM_CRON, async (tx) => {
          if (attempts >= 5) {
            Logger.error(`[CRITICAL ALERT] CameraStreamInvalidation FAILED permanently. Manual MediaMTX intervention required for path: ${job.opaquePath}`, {
              jobId: job.id,
              cameraId: job.cameraId,
              tenantId: job.tenantId,
              error: err.message
            });

            await tx.cameraStreamInvalidation.update({
              where: { id: job.id },
              data: {
                status: 'FAILED',
                attempts,
                lastError: err.message || 'Unknown error'
              }
            });
          } else {
            const backoffDelay = (Math.pow(2, attempts) * 10000) + (Math.random() * 10000);
            const nextAttempt = new Date(Date.now() + backoffDelay);
            
            await tx.cameraStreamInvalidation.update({
              where: { id: job.id },
              data: {
                status: 'PENDING',
                attempts,
                lastError: err.message || 'Unknown error',
                nextAttemptAt: nextAttempt
              }
            });
          }
        });
        failCount++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: claimedJobs.length,
      succeeded: successCount,
      failed: failCount
    });
  } catch (error) {
    Logger.error('Error processing CCTV invalidations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiContext(original_GET);

