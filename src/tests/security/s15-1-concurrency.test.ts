import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { DistributedConcurrencyLock } from '@/lib/security/concurrency-lock';
import { getRedisClient } from '@/lib/redis/redis.client';


vi.mock('@/lib/redis/redis.client', async () => {
  const original: any = await vi.importActual('@/lib/redis/redis.client');
  return {
    ...original,
    getRedisClient: vi.fn()
  };
});

describe('S15.1 FND-15-01: Concurrency Lock Resilience', () => {
  const tenantId = 'test-tenant-1';
  const userId = 'user-1';
  const requestId = 'req-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('MUST fail closed when Redis is unavailable (ECONNREFUSED)', async () => {
    // Mock Redis throwing an error
    const mockRedis = {
      scard: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      set: vi.fn(),
      del: vi.fn(),
      eval: vi.fn()
    };
    (getRedisClient as Mock).mockReturnValue(mockRedis);

    const result = await DistributedConcurrencyLock.acquire(tenantId, userId, requestId);
    
    // Critical assertion: If redis fails, it must deny the lock, no local fallback
    expect(result.acquired).toBe(false);
  });

  it('MUST NOT allow multiple instances to acquire lock during Redis outage', async () => {
    const mockRedis = {
      scard: vi.fn().mockRejectedValue(new Error('timeout')),
    };
    (getRedisClient as Mock).mockReturnValue(mockRedis);

    // Simulate two concurrent requests hitting same/different pods
    const instanceA = await DistributedConcurrencyLock.acquire(tenantId, userId, 'req-A');
    const instanceB = await DistributedConcurrencyLock.acquire(tenantId, userId, 'req-B');

    expect(instanceA.acquired).toBe(false);
    expect(instanceB.acquired).toBe(false);
  });

  it('MUST succeed when Redis is healthy and slots are available', async () => {
    const mockRedis = {
      scard: vi.fn().mockResolvedValue(0), // No active locks
      set: vi.fn().mockResolvedValue('OK'), // Acquire succeeds
      del: vi.fn(),
    };
    (getRedisClient as Mock).mockReturnValue(mockRedis);

    const result = await DistributedConcurrencyLock.acquire(tenantId, userId, requestId);
    expect(result.acquired).toBe(true);
    expect(result.lockKey).toBe(requestId);
    
    // Verify TTL was set (PX)
    expect(mockRedis.set).toHaveBeenCalledWith(expect.any(String), requestId, 'PX', expect.any(Number), 'NX');
  });

  it('MUST enforce ownership on release via Lua script', async () => {
    const mockRedis = {
      eval: vi.fn().mockResolvedValue(1) // Simulate successful Lua execution
    };
    (getRedisClient as Mock).mockReturnValue(mockRedis);

    await DistributedConcurrencyLock.release(tenantId, userId, requestId);

    // Assert that the Lua script is called, passing the requestId as ARGV[1] for verification
    const evalCalls = mockRedis.eval.mock.calls;
    expect(evalCalls.length).toBeGreaterThan(0);
    expect(evalCalls[0][0]).toContain('if redis.call("get", KEYS[1]) == ARGV[1] then');
    expect(evalCalls[0][3]).toBe(requestId); // ARGV[1] is the 4th argument to eval
  });
});
