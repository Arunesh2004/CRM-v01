import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withJobContext } from '../../lib/queue/worker';
import { getContext } from '../../lib/observability/context';
import { SecureJobEnvelope } from '../../lib/queue/types';

// Use proper RFC 4122 UUIDs so assertValidTenantId passes.
// The security hardening in database/utils/tenant-id.ts enforces UUID-only tenant IDs
// to prevent SQL injection in raw queries.
const TENANT_1 = '11111111-aaaa-4111-8111-000000000001';
const TENANT_2 = '22222222-bbbb-4222-9222-000000000002';
const TENANT_A = 'aaaaaaaa-cccc-4aaa-8aaa-000000000001';
const TENANT_B = 'bbbbbbbb-dddd-4bbb-9bbb-000000000002';
const TENANT_5 = '55555555-eeee-4555-8555-000000000005';
const TENANT_6 = '66666666-ffff-4666-9666-000000000006';
const TENANT_8 = '88888888-aaaa-4888-8888-000000000008';

describe('S15.3A Background Job Observability Context', () => {

  // Mock withTenant from prisma-tenant — must be at top-level (vitest hoists vi.mock)
  vi.mock('../../../database/utils/prisma-tenant', () => {
    const mockTx = {
      $executeRawUnsafe: vi.fn(),
      $executeRaw: vi.fn(),
      $queryRawUnsafe: vi.fn().mockResolvedValue([]),
      $queryRaw: vi.fn().mockResolvedValue([]),
      idempotencyKey: { create: vi.fn() },
    };
    return {
      withTenant: vi.fn().mockReturnValue({
        $transaction: async (fn: any) => fn(mockTx)
      }),
      withTenantTransaction: vi.fn()
    };
  });

  // We mock Logger to avoid spewing logs in tests
  vi.mock('../../lib/logger/logger', () => ({
    Logger: {
      info: vi.fn(),
      error: vi.fn(),
    }
  }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Ensure context is cleared globally if tests fail
    expect(getContext()).toBeUndefined();
  });

  it('Test 1: Single background job receives job context', async () => {
    const envelope: SecureJobEnvelope<any> = {
      jobId: 'job-1',
      jobType: 'TEST',
      tenantId: TENANT_1,
      actorType: 'SYSTEM',
      payload: {},
      schemaVersion: '1.0',
      correlationId: ''
    };

    let capturedContext: any;
    await withJobContext(envelope, async () => {
      capturedContext = getContext();
      return true;
    });

    expect(capturedContext).toBeDefined();
    expect(capturedContext.jobId).toBe('job-1');
  });

  it('Test 2: Tenant context is preserved from trusted job metadata', async () => {
    const envelope: SecureJobEnvelope<any> = {
      jobId: 'job-2',
      jobType: 'TEST',
      tenantId: TENANT_2,
      actorType: 'SYSTEM',
      payload: {},
      schemaVersion: '1.0',
      correlationId: ''
    };

    let capturedContext: any;
    await withJobContext(envelope, async () => {
      capturedContext = getContext();
      return true;
    });

    expect(capturedContext.tenantId).toBe(TENANT_2);
  });

  it('Test 4: Two concurrent jobs with different tenants never cross context', async () => {
    const envelopeA: SecureJobEnvelope<any> = {
      jobId: 'job-a',
      jobType: 'TEST',
      tenantId: TENANT_A,
      actorType: 'SYSTEM',
      payload: {},
      schemaVersion: '1.0',
      correlationId: ''
    };

    const envelopeB: SecureJobEnvelope<any> = {
      jobId: 'job-b',
      jobType: 'TEST',
      tenantId: TENANT_B,
      actorType: 'SYSTEM',
      payload: {},
      schemaVersion: '1.0',
      correlationId: ''
    };

    let contextA: any;
    let contextB: any;

    const promiseA = withJobContext(envelopeA, async () => {
      await new Promise(r => setTimeout(r, 10)); // Force yield
      contextA = getContext();
    });

    const promiseB = withJobContext(envelopeB, async () => {
      await new Promise(r => setTimeout(r, 10)); // Force yield
      contextB = getContext();
    });

    await Promise.all([promiseA, promiseB]);

    expect(contextA.tenantId).toBe(TENANT_A);
    expect(contextB.tenantId).toBe(TENANT_B);
  });

  it('Test 5: Context cleared after successful completion', async () => {
    const envelope: SecureJobEnvelope<any> = {
      jobId: 'job-5',
      jobType: 'TEST',
      tenantId: TENANT_5,
      actorType: 'SYSTEM',
      payload: {},
      schemaVersion: '1.0',
      correlationId: ''
    };

    await withJobContext(envelope, async () => {
      expect(getContext()).toBeDefined();
    });

    expect(getContext()).toBeUndefined();
  });

  it('Test 6: Context cleared after failure', async () => {
    const envelope: SecureJobEnvelope<any> = {
      jobId: 'job-6',
      jobType: 'TEST',
      tenantId: TENANT_6,
      actorType: 'SYSTEM',
      payload: {},
      schemaVersion: '1.0',
      correlationId: ''
    };

    await expect(withJobContext(envelope, async () => {
      expect(getContext()).toBeDefined();
      throw new Error('Deliberate job failure');
    })).rejects.toThrow('Deliberate job failure');

    expect(getContext()).toBeUndefined();
  });

  it('Test 8: No HTTP requestId is fabricated for jobs that have none', async () => {
    const envelope: SecureJobEnvelope<any> = {
      jobId: 'job-8',
      jobType: 'TEST',
      tenantId: TENANT_8,
      actorType: 'SYSTEM',
      payload: {},
      schemaVersion: '1.0',
      correlationId: ''
    };

    let capturedContext: any;
    await withJobContext(envelope, async () => {
      capturedContext = getContext();
      return true;
    });
    
    // correlationId is empty, so requestId should be undefined or empty, not fabricated.
    expect(capturedContext.requestId).toBeFalsy();
  });

});
