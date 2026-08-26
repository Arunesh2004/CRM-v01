import { withTenant, withTenantTransaction } from '../../../database/utils/prisma-tenant';
import { SecureJobEnvelope } from './types';
import { PrismaClient, Prisma } from '@prisma/client';

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
  return await tenantPrisma.$transaction(async (tx: any) => {
    // Elevate to a tenant-scoped transaction for RLS
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', '${envelope.tenantId}', true)`);
    
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
        console.log(`[Idempotency] Skipping duplicate job: ${envelope.jobId}`);
        return null as any; 
      }
      throw e;
    }

    // Pass execution to business handler with bounded context
    return await handler(tx, envelope.payload);
  });
}

export async function sendToDeadLetterQueue(
  envelope: SecureJobEnvelope<any>, 
  error: Error, 
  attemptCount: number
) {
  try {
    const tenantPrisma = withTenant(envelope.tenantId);
    await tenantPrisma.deadLetterQueue.create({
      data: {
        tenantId: envelope.tenantId,
        jobId: envelope.jobId,
        jobType: envelope.jobType,
        correlationId: envelope.correlationId,
        payload: envelope.payload,
        lastError: error.message,
        attemptCount,
        status: 'PENDING'
      }
    });
  } catch (dbError) {
    console.error('FATAL: Failed to write to DLQ', dbError);
  }
}

