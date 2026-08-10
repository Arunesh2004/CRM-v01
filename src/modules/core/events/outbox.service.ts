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
