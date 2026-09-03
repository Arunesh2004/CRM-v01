import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DistributedRateLimiter } from '@/lib/rate-limit/rate-limiter';
import * as redisClient from '@/lib/redis/redis.client';
import crypto from 'crypto';

describe('S15.2 FND-15-05: Rate Limiter Resilience', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('STRONG: MUST fail closed when configured for fail-closed on Redis failure', async () => {
    // Mock Redis to throw an error
    vi.spyOn(redisClient, 'getRedisClient').mockImplementation(() => {
      throw new Error('Redis connection lost');
    });

    const tenantId = crypto.randomUUID();
    
    // Pass 'fail-closed' failure mode
    const result = await DistributedRateLimiter.checkLimit(
      tenantId,
      'AI_ASSISTANT',
      'QUERY',
      10,
      60,
      undefined,
      undefined,
      'fail-closed'
    );

    // Assert that the request was explicitly denied (allowed: false, remaining: 0)
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('STRONG: MUST degrade to memory fallback when configured for degrade on Redis failure', async () => {
    // Mock Redis to throw an error
    vi.spyOn(redisClient, 'getRedisClient').mockImplementation(() => {
      throw new Error('Redis connection lost');
    });

    const tenantId = crypto.randomUUID();
    
    // Pass 'degrade' failure mode (or use default if changed, but we default to fail-closed)
    const result = await DistributedRateLimiter.checkLimit(
      tenantId,
      'LOW_RISK_API',
      'READ',
      10,
      60,
      undefined,
      undefined,
      'degrade'
    );

    // Assert that the request was allowed by the memory fallback
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });
});
