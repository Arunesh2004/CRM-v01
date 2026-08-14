import { PrismaClient } from '@prisma/client';
import { EventBus } from '@/modules/core/events/event-bus';

const prisma = new PrismaClient();
const MAX_RETRIES = 5;

export async function processOutbox() {
  console.log('Processing EventOutbox...');

  const pendingEvents = await prisma.eventOutbox.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      nextRetryAt: { lte: new Date() },
      retryCount: { lt: MAX_RETRIES }
    },
    take: 100, // Process in batches
    orderBy: { createdAt: 'asc' }
  });

  if (pendingEvents.length === 0) {
    return { success: true, processed: 0 };
  }

  let processedCount = 0;

  for (const event of pendingEvents) {
    // Optimistic locking using 'status' to prevent concurrent worker execution
    const lock = await prisma.eventOutbox.updateMany({
      where: { id: event.id, status: event.status },
      data: { status: 'PROCESSING' }
    });

    if (lock.count === 0) {
      // Event was picked up by another worker or is no longer pending/failed
      continue;
    }

    try {
      // Publish event
      await EventBus.emit(event.eventType, {
        tenantId: event.tenantId,
        ...(event.payload as object)
      });

      // Mark as PROCESSED
      await prisma.eventOutbox.update({
        where: { id: event.id },
        data: { status: 'PROCESSED', processedAt: new Date() }
      });
      processedCount++;
    } catch (error: any) {
      // Handle failure
      const nextRetry = new Date(Date.now() + Math.pow(2, event.retryCount) * 60000); // Exp backoff in minutes
      await prisma.eventOutbox.update({
        where: { id: event.id },
        data: {
          status: 'FAILED',
          lastError: error.message,
          retryCount: event.retryCount + 1,
          nextRetryAt: nextRetry
        }
      });
    }
  }

  return { success: true, processed: processedCount };
}

export async function cleanupOutbox() {
  console.log('Cleaning up EventOutbox...');

  // PROCESSED events retained for 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // FAILED events retained for 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  let deletedCount = 0;
  let hasMore = true;

  while (hasMore) {
    // 1. Find candidates to delete. Using nextRetryAt as a stable timestamp for terminal failures.
    const candidates = await prisma.eventOutbox.findMany({
      where: {
        OR: [
          { status: 'PROCESSED', processedAt: { lt: sevenDaysAgo } },
          { status: 'FAILED', retryCount: { gte: MAX_RETRIES }, nextRetryAt: { lt: thirtyDaysAgo } }
        ]
      },
      select: { id: true },
      take: 200 // Bound batch size
    });

    if (candidates.length === 0) {
      hasMore = false;
      break;
    }

    const idsToDelete = candidates.map(c => c.id);

    // 2. Delete candidates using PK to avoid massive locking
    const deleteResult = await prisma.eventOutbox.deleteMany({
      where: {
        id: { in: idsToDelete },
        // Double check status to prevent race conditions just in case
        status: { in: ['PROCESSED', 'FAILED'] }
      }
    });

    deletedCount += deleteResult.count;

    // Safety break if deleteMany deletes fewer than candidates found to avoid infinite loop
    if (deleteResult.count === 0) {
      hasMore = false;
    }
  }

  console.log(`Outbox cleanup completed. Deleted ${deletedCount} records.`);
  return { success: true, deleted: deletedCount };
}
