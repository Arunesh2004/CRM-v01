import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProviderConfigurationError, ProviderRateLimitError, ProviderTransientError } from '@/lib/observability/errors';
import { outboxWorkerHandler } from '@/lib/queue/functions/outbox.worker';
import { SecureJobEnvelope } from '@/lib/queue/types';
import globalPrisma from '@db/utils/prisma';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';

vi.mock('@/lib/queue/inngest.client', () => ({
  inngest: { send: vi.fn(), createFunction: vi.fn() }
}));

vi.mock('@/lib/providers/provider.factory', () => ({
  ProviderFactory: {
    getTelephonyProvider: vi.fn().mockReturnValue({
      sendSms: vi.fn().mockImplementation(async (tenantId, payload) => {
        if (payload.body === '502') return { success: false, error: '502 Bad Gateway' };
        if (payload.body === '401') return { success: false, error: 'not configured' };
        return { success: true };
      }),
      initiateCall: vi.fn()
    })
  }
}));

describe('Phase 10 Failure Mode & Provider Behavior Tests', () => {
  let testTenantId = '46eb1837-72bc-4b96-bf94-c65d9ed819d8';

    beforeEach(async () => {
    vi.clearAllMocks();
    const t = await executeAsSystem(SystemOperation.PLATFORM_EVENT, async tx => tx.tenant.create({ data: { name: 'test' } }));
    testTenantId = t.id;
  });

  afterEach(async () => {
    await executeAsSystem(SystemOperation.PLATFORM_EVENT, async tx => tx.tenant.deleteMany({ where: { id: testTenantId } }));
  });

  it('F2: Communication Provider - Network/502 Gateway maps to ProviderTransientError (Retryable)', async () => {
    const envelope: SecureJobEnvelope<any> = {
      jobId: 'job-1', tenantId: testTenantId, actorType: 'SYSTEM', correlationId: 'req-1',
      jobType: 'SEND_SMS', payload: { to: '+123', body: '502' }, schemaVersion: '1.0'
    };

    await expect(outboxWorkerHandler({ event: { data: envelope }, step: { run: (name: string, fn: any) => fn() } } as any))
      .rejects.toThrow(ProviderTransientError);
  });

  it('F3: Communication Provider - Authentication Failure maps to ProviderConfigurationError (Non-retryable)', async () => {
    const envelope: SecureJobEnvelope<any> = {
      jobId: 'job-2', tenantId: testTenantId, actorType: 'SYSTEM', correlationId: 'req-2',
      jobType: 'SEND_SMS', payload: { to: '+123', body: '401' }, schemaVersion: '1.0'
    };

    const { NonRetriableError } = await import('inngest');
    await expect(outboxWorkerHandler({ event: { data: envelope }, step: { run: (name: string, fn: any) => fn() } } as any))
      .rejects.toThrow(NonRetriableError);
  });
});
