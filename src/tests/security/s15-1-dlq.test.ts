import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { sendToDeadLetterQueue } from '@/lib/queue/worker';
import { SecureJobEnvelope } from '@/lib/queue/types';
import crypto from 'crypto';
import { executeAsSystem, SystemOperation } from "@db/utils/prisma-system";

describe('S15.1 FND-15-02: Dead Letter Queue Resilience', () => {
  const tenantId = crypto.randomUUID();
  let jobId: string;
  let inngestEventId: string;
  let envelope: SecureJobEnvelope<any>;

  beforeAll(async () => {
    // Create test tenant
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.tenant.upsert({
            where: { id: tenantId },
            create: { id: tenantId, name: 'DLQ Test Tenant' },
            update: {}
          }));
  });

  beforeEach(() => {
    jobId = crypto.randomUUID();
    inngestEventId = crypto.randomUUID();
    envelope = {
      jobId,
      tenantId,
      actorType: 'SYSTEM',
      correlationId: `corr-${Date.now()}`,
      jobType: 'test.job',
      payload: { 
        someData: '123', 
        password: 'super-secret',
        nested: { token: 'abc' }
      },
      schemaVersion: '1.0'
    };
  });

  afterEach(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.deadLetterQueue.deleteMany({ where: { tenantId } })).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.idempotencyKey.deleteMany({ where: { tenantId } })).catch(() => {});
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.tenant.delete({ where: { id: tenantId } })).catch(() => {});
  });

  it('MUST durably persist a terminal failure and sanitize sensitive payloads', async () => {
    await sendToDeadLetterQueue(envelope, new Error('Terminal Failure'), 5, inngestEventId);

    const dlqRecord = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.deadLetterQueue.findFirst({
          where: { jobId, tenantId }
        }));

    expect(dlqRecord).not.toBeNull();
    expect(dlqRecord?.lastError).toBe('Terminal Failure');
    expect(dlqRecord?.attemptCount).toBe(5);

    // Verify sanitization
    const storedPayload: any = dlqRecord?.payload;
    expect(storedPayload.someData).toBe('123'); // Normal data kept
    expect(storedPayload.password).toBe('[REDACTED]'); // Sanitized
    expect(storedPayload.nested.token).toBe('[REDACTED]'); // Nested sanitized
  });

  it('MUST be idempotent on duplicate delivery', async () => {
    // First delivery
    await sendToDeadLetterQueue(envelope, new Error('Terminal Failure 1'), 5, inngestEventId);
    
    // Duplicate delivery of exactly the same terminal event
    await sendToDeadLetterQueue(envelope, new Error('Terminal Failure 2 (Duplicate)'), 5, inngestEventId);

    const dlqRecords = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.deadLetterQueue.findMany({
          where: { jobId, tenantId }
        }));

    // Should only be one record, P2002 was handled gracefully
    expect(dlqRecords.length).toBe(1);
    expect(dlqRecords[0].lastError).toBe('Terminal Failure 1'); // Keeps the first error
  });

  it('MUST create distinct DLQ records for different terminal failures of the same job', async () => {
    // This happens if a job succeeds initially, but later the same jobId is used for another event 
    // OR if we use a different inngestEventId.
    const inngestEventId2 = crypto.randomUUID();

    await sendToDeadLetterQueue(envelope, new Error('Terminal Failure 1'), 5, inngestEventId);
    await sendToDeadLetterQueue(envelope, new Error('Terminal Failure 2'), 5, inngestEventId2);

    const dlqRecords = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.deadLetterQueue.findMany({
          where: { jobId, tenantId }
        }));

    expect(dlqRecords.length).toBe(2);
  });
});
