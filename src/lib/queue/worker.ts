import { withTenant, withTenantTransaction } from '../../../database/utils/prisma-tenant';
import { assertValidTenantId } from '../../../database/utils/tenant-id';
import { SecureJobEnvelope } from './types';
import { PrismaClient, Prisma } from '@prisma/client';
import { redact } from '../observability/redact';
import { FailureEventPayload } from 'inngest';
import { withContext } from '../observability/context';
import { Logger } from '../logger/logger';

const globalPrisma = new PrismaClient();

export async function withJobContext<T>(
  envelope: SecureJobEnvelope<any>,
  handler: (tx: any, payload: any) => Promise<T>
): Promise<T> {
  // Validate job context presence
  if (!envelope.tenantId) {
    throw new Error('SECURE_CONTEXT_ERROR: Job missing tenantId');
  }
  if (!envelope.actorType) {
    throw new Error('SECURE_CONTEXT_ERROR: Job missing actorType');
  }

  const tenantPrisma = withTenant(envelope.tenantId);

  // Create RLS bounded transaction directly on the tenant scoped client
  return await withContext(
    { 
      tenantId: envelope.tenantId, 
      jobId: envelope.jobId,
      requestId: envelope.correlationId 
    },
    async () => {
      return await tenantPrisma.$transaction(async (tx: any) => {
        // Elevate to a tenant-scoped transaction for RLS
        assertValidTenantId(envelope.tenantId);
        await tx.$queryRawUnsafe(`SELECT set_config('app.current_tenant_id', '${envelope.tenantId}', true)`);
        
        // Check idempotency
        try {
          await tx.idempotencyKey.create({
            data: {
              tenantId: envelope.tenantId,
              key: envelope.jobId, // Unique per tenant + jobId
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days retention
            }
          });
        } catch (e: any) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            // Idempotency conflict - job already processed
            Logger.info(`[Idempotency] Skipping duplicate job`, { jobId: envelope.jobId });
            return null as any; 
          }
          throw e;
        }

        // Pass execution to business handler with bounded context
        return await handler(tx, envelope.payload);
      });
    }
  );
}

export async function sendToDeadLetterQueue(
  envelope: SecureJobEnvelope<any>, 
  error: Error, 
  attemptCount: number,
  inngestEventId: string
) {
  try {
    const tenantPrisma = withTenant(envelope.tenantId);
    await tenantPrisma.$transaction(async (tx: any) => {
      await tx.idempotencyKey.create({
        data: {
          tenantId: envelope.tenantId,
          key: inngestEventId,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
      
      await tx.deadLetterQueue.create({
        data: {
          tenantId: envelope.tenantId,
          jobId: envelope.jobId,
          jobType: envelope.jobType,
          correlationId: envelope.correlationId,
          payload: redact(envelope.payload) as any,
          lastError: error.message,
          attemptCount,
          status: 'PENDING'
        }
      });
    });
  } catch (dbError: any) {
    if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2002') {
      Logger.info(`[Idempotency] DLQ record already exists for event`, { eventId: inngestEventId });
      return;
    }
    Logger.error('FATAL: Failed to write to DLQ', dbError);
    throw dbError;
  }
}

function hasStringId(obj: unknown): obj is { id: string } {
  return typeof obj === 'object' && obj !== null && 'id' in obj && typeof (obj as { id?: unknown }).id === 'string';
}

export function getFailureEventIdSafe(event: FailureEventPayload): string {
  if (event.data?.run_id) {
    return event.data.run_id;
  }
  
  if (hasStringId(event.data?.event)) {
    return event.data.event.id;
  }

  throw new Error("SECURE_CONTEXT_ERROR: Failure event is missing a valid run_id required for idempotency");
}
