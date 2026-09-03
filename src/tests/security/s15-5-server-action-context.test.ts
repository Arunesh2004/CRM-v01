import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withServerActionContext } from '@/lib/observability/server-action';
import { getContext, setTenantContext, withContext, requestContext } from '@/lib/observability/context';
import { requireTenant } from '@/lib/auth';

// Mock headers
let mockHeaders: Map<string, string> = new Map();
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => mockHeaders),
}));

// Mock auth (for testing negative auth behavior)
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...actual,
    requireTenant: vi.fn(async () => {
      // Simulate resolving a tenant securely
      const tenantId = 'tenant-secure-123';
      setTenantContext(tenantId);
      return tenantId;
    }),
  };
});

describe('S15.5 FND-15.4-01: Server Action Observability Context', () => {
  beforeEach(() => {
    mockHeaders.clear();
    vi.clearAllMocks();
  });

  it('STRONG: missing correlation header generates new requestId', async () => {
    const action = withServerActionContext(async () => {
      return getContext()?.requestId;
    });

    const result = await action();
    expect(result).toBeDefined();
    expect(result?.length).toBeGreaterThan(10);
  });

  it('STRONG: valid correlation header is accepted', async () => {
    mockHeaders.set('x-correlation-id', 'test-req-123');
    const action = withServerActionContext(async () => {
      return getContext()?.requestId;
    });

    const result = await action();
    expect(result).toBe('test-req-123');
  });

  it('STRONG: malformed or oversized correlation header generates new requestId', async () => {
    const invalidId = 'a'.repeat(100);
    mockHeaders.set('x-correlation-id', invalidId);
    
    const action = withServerActionContext(async () => {
      return getContext()?.requestId;
    });

    const result = await action();
    expect(result).toBeDefined();
    expect(result).not.toBe(invalidId);
  });

  it('STRONG: thrown errors are unchanged', async () => {
    const action = withServerActionContext(async () => {
      throw new Error('Business Logic Error');
    });

    await expect(action()).rejects.toThrow('Business Logic Error');
  });

  it('STRONG: successful return values are unchanged', async () => {
    const action = withServerActionContext(async (a: number, b: number) => {
      return a + b;
    });

    const result = await action(2, 3);
    expect(result).toBe(5);
  });

  it('STRONG: context is cleaned up after failure and success', async () => {
    const successAction = withServerActionContext(async () => true);
    const failAction = withServerActionContext(async () => { throw new Error('fail'); });

    await successAction();
    expect(getContext()).toBeUndefined(); // Should not leak

    try {
      await failAction();
    } catch {}
    expect(getContext()).toBeUndefined();
  });

  it('STRONG: setTenantContext strictly isolates and propagates secure tenant', async () => {
    const action = withServerActionContext(async () => {
      await requireTenant();
      return getContext()?.tenantId;
    });

    const result = await action();
    expect(result).toBe('tenant-secure-123');
  });

  it('STRONG: conflicting tenant context throws context conflict error', async () => {
    // Attempt to override tenant B when tenant A is already established
    const task = new Promise<void>((resolve, reject) => {
      withContext({ tenantId: 'existing-tenant-A' }, async () => {
        try {
          // A malicious or logically flawed sub-call attempts to establish tenant B
          setTenantContext('malicious-tenant-B');
          resolve();
        } catch (err: any) {
          reject(err);
        }
      });
    });

    await expect(task).rejects.toThrow(/Context Conflict: Attempted to overwrite existing tenant existing-tenant-A with malicious-tenant-B/);
  });

  it('STRONG: concurrent actions do not leak context', async () => {
    const results: string[] = [];

    const action1 = withServerActionContext(async () => {
      // Simulate yielding to let another action execute
      await new Promise(r => setTimeout(r, 10));
      return getContext()?.requestId;
    });

    const action2 = withServerActionContext(async () => {
      await new Promise(r => setTimeout(r, 5));
      return getContext()?.requestId;
    });

    mockHeaders.set('x-correlation-id', 'req-1');
    const t1 = action1();
    
    // Let event loop tick so action1 reads headers before we mutate mockHeaders
    await new Promise(r => setTimeout(r, 0));
    
    // Switch header before executing action2
    mockHeaders.set('x-correlation-id', 'req-2');
    const t2 = action2();

    const [r1, r2] = await Promise.all([t1, t2]);
    
    // Expect strict isolation
    expect(r1).toBe('req-1');
    expect(r2).toBe('req-2');
  });
});
