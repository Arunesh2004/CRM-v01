import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processCallCompleted } from '@/modules/communication/jobs/call-transcription.worker';
import { SecureJobEnvelope } from '@/lib/queue/types';
import { executeAsSystem, SystemOperation } from "@db/utils/prisma-system";

// Mock dependencies to force a transcription failure
vi.mock('@/lib/providers/ai/gemini.provider', () => {
  return {
    GeminiProvider: class {
      async transcribeAudio() {
        throw new Error('Simulated transcription failure for DLQ bypass test');
      }
    }
  };
});

vi.mock('@/lib/providers/telephony/twilio.provider', () => {
  return {
    TwilioProvider: class {
      async downloadRecording() { return '/tmp/fake.wav'; }
    },
    MockTelephonyProvider: class {
      async downloadRecording() { return '/tmp/fake.wav'; }
    }
  };
});

describe('S15.1B HIGH Finding: call-transcription DLQ bypass', () => {
  const tenantId = 't-dlq-bypass-test';

  beforeEach(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.deadLetterQueue.deleteMany({ where: { tenantId } })).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.callLog.deleteMany({ where: { tenantId } })).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.tenant.deleteMany({ where: { id: tenantId } })).catch(() => {});

    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.tenant.create({
            data: { id: tenantId, name: 'Test Tenant DLQ Bypass' }
          }));

    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.callLog.create({
            data: {
              id: 'cl-bypass-test',
              tenantId,
              providerCallId: 'sid-bypass-123',
              status: 'COMPLETED',
              metadata: { transcriptStatus: 'PENDING' }
            }
          }));
  });

  it('STRONG: MUST NOT manually create a DLQ record but MUST rethrow the error for Inngest to handle', async () => {
    const envelope: SecureJobEnvelope<any> = {
      jobId: 'job-dlq-bypass',
      jobType: 'CALL_COMPLETED',
      tenantId,
      actorType: 'SYSTEM',
      schemaVersion: '1.0',
      correlationId: 'corr-123',
      payload: {
        callSid: 'sid-bypass-123',
        recordingUrl: 'https://api.twilio.com/mock.wav',
        sensitiveToken: 'secret123'
      }
    };

    // Act & Assert
    // The worker should throw the error back to the caller (outboxWorker)
    await expect(processCallCompleted(envelope)).rejects.toThrow('Simulated transcription failure for DLQ bypass test');

    // Assert that the manual bypass is gone (no DLQ record should be created internally by processCallCompleted)
    const dlqRecords = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.deadLetterQueue.findMany({
          where: { tenantId, jobId: 'job-dlq-bypass' }
        }));

    expect(dlqRecords.length).toBe(0); // Proves the manual catch block is gone
  });
});
