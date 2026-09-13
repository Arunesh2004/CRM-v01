import { withTenant } from '../../../database/utils/prisma-tenant';
import { assertValidTenantId } from '../../../database/utils/tenant-id';
import { SecureJobEnvelope } from './types';
import { Prisma } from '@prisma/client';
import { redact } from '../observability/redact';
import { FailureEventPayload } from 'inngest';
import { withContext } from '../observability/context';
import { Logger } from '../logger/logger';


export async function withJobContext<T, Tx extends Prisma.TransactionClient = Prisma.TransactionClient>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  envelope: SecureJobEnvelope<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  handler: (tx: Tx, payload: any) => Promise<T>
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
      return await tenantPrisma.$transaction(async (tx) => {
        // Elevate to a tenant-scoped transaction for RLS
        assertValidTenantId(envelope.tenantId);
        await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${envelope.tenantId}, true)`;

        // Check idempotency
        try {
          await tx.idempotencyKey.create({
            data: {
              tenantId: envelope.tenantId,
              key: envelope.jobId, // Unique per tenant + jobId
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days retention
            }
          });
        } catch (eRaw: unknown) {
          const e = eRaw instanceof Error ? eRaw : new Error(String(eRaw));
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            // Idempotency conflict - job already processed
            Logger.info(`[Idempotency] Skipping duplicate job`, { jobId: envelope.jobId });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
            return null as any;
          }
          throw e;
        }

        // Pass execution to business handler with bounded context
        return await handler(tx as unknown as Tx, envelope.payload);
      });
    }
  );
}

export async function sendToDeadLetterQueue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  envelope: SecureJobEnvelope<any>,
  error: Error,
  attemptCount: number,
  inngestEventId: string
) {
  try {
    const tenantPrisma = withTenant(envelope.tenantId);
    await tenantPrisma.$transaction(async (tx) => {
      // IdempotencyKey is intentionally excluded from withTenant middleware to prevent nested
      // transactions. Manually set tenant context here so the RLS policy is satisfied.
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${envelope.tenantId}, true)`;
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
          payload: redact(envelope.payload) as any,
          lastError: error.message,
          attemptCount,
          status: 'PENDING'
        }
      });
    });
  } catch (dbErrorRaw: unknown) {
    const dbError = dbErrorRaw instanceof Error ? dbErrorRaw : new Error(String(dbErrorRaw));
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
