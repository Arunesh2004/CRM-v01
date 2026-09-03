import { withApiContext } from '@/lib/observability/context';
import { Logger } from '@/lib/logger/logger';
import { NextRequest, NextResponse } from 'next/server';
import globalPrisma from '@db/utils/prisma';
import { ENV } from '@/lib/config/env';
import { CameraStreamInvalidationStatus } from '@prisma/client';

const original_GET = async function (req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Recover stale PROCESSING jobs (stuck for > 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await globalPrisma.cameraStreamInvalidation.updateMany({
      where: {
        status: 'PROCESSING',
        updatedAt: { lt: fiveMinutesAgo }
      },
      data: {
        status: 'PENDING'
      }
    });

    // 2. Fetch pending jobs that are ready to run
    // Distributed-safe job claiming strategy using skip locked (simulated with status transition)
    // First, find jobs ready to execute
    const readyJobs = await globalPrisma.cameraStreamInvalidation.findMany({
      where: {
        status: 'PENDING',
        nextAttemptAt: { lte: new Date() }
      },
      take: 50,
      orderBy: { nextAttemptAt: 'asc' }
    });

    if (readyJobs.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending invalidations' });
    }

    // 3. Atomically claim jobs (if another worker already claimed, their status is no longer PENDING)
    const claimedJobs = [];
    for (const job of readyJobs) {
      const claimed = await globalPrisma.cameraStreamInvalidation.updateMany({
        where: { id: job.id, status: 'PENDING' },
        data: { status: 'PROCESSING' }
      });
      if (claimed.count > 0) {
        claimedJobs.push(job);
      }
    }

    // 4. Process claimed jobs
    const mediamtxUrl = ENV.mediamtxApiUrl || 'http://localhost:9997';
    let successCount = 0;
    let failCount = 0;

    for (const job of claimedJobs) {
      try {
        const response = await fetch(`${mediamtxUrl}/v3/config/paths/delete/${job.opaquePath}`, {
          method: 'DELETE'
        });

        // 404 is considered success because the path is already gone
        if (response.ok || response.status === 404) {
          await globalPrisma.cameraStreamInvalidation.update({
            where: { id: job.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              attempts: job.attempts + 1
            }
          });
          successCount++;
        } else {
          throw new Error(`MediaMTX responded with status ${response.status}`);
        }
      } catch (err: any) {
        const attempts = job.attempts + 1;
        if (attempts >= 5) {
          // Permanent failure, no more retries.
          // EXPLICIT IMPLEMENTATION REQUIREMENT: FAILED jobs must never be silently ignored.
          // Trigger operational alert for terminal configuration state in the streaming cluster.
          Logger.error(`[CRITICAL ALERT] CameraStreamInvalidation FAILED permanently. Manual MediaMTX intervention required for path: ${job.opaquePath}`, {
            jobId: job.id,
            cameraId: job.cameraId,
            tenantId: job.tenantId,
            error: err.message
          });
          // In a real production system, this would integrate with Datadog/PagerDuty/Slack.

          await globalPrisma.cameraStreamInvalidation.update({
            where: { id: job.id },
            data: {
              status: 'FAILED',
              attempts,
              lastError: err.message || 'Unknown error'
            }
          });
        } else {
          // Exponential backoff with jitter
          // 2^attempts * 10 seconds + up to 10 seconds jitter
          const backoffDelay = (Math.pow(2, attempts) * 10000) + (Math.random() * 10000);
          const nextAttempt = new Date(Date.now() + backoffDelay);
          
          await globalPrisma.cameraStreamInvalidation.update({
            where: { id: job.id },
            data: {
              status: 'PENDING',
              attempts,
              lastError: err.message || 'Unknown error',
              nextAttemptAt: nextAttempt
            }
          });
        }
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
