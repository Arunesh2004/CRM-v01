import { describe, it, expect, beforeEach } from 'vitest';
import { DistributedRateLimiter } from '../../lib/rate-limit/rate-limiter';
import crypto from 'crypto';

describe('Adversarial Rate Limiting (Stage 7)', () => {
  it('ATTACK: Attempt to bypass rate limiting limits', async () => {
    const tenantId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const limit = 5; // max 5 requests
    const windowSecs = 60; // 1 minute

    // We will spam the rate limiter with 10 requests. 
    // The first 5 should be accepted (isAllowed: true), the next 5 should be blocked (isAllowed: false).

    let allowedCount = 0;
    let blockedCount = 0;

    for (let i = 0; i < 10; i++) {
      const result = await DistributedRateLimiter.checkLimit(
        tenantId,
        'TEST_ACTION',
        'READ',
        limit,
        windowSecs,
        undefined,
        userId
      );
      
      if (result.allowed) {
        allowedCount++;
      } else {
        blockedCount++;
      }
    }

    // Verify exactly 5 were allowed and 5 were blocked
    expect(allowedCount).toBe(5);
    expect(blockedCount).toBe(5);
  });
  
  it('ATTACK: Concurrent rate limiting bypass', async () => {
    const tenantId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const limit = 10;
    const windowSecs = 60;
    
    // Fire 50 concurrent requests
    const promises = [];
    for(let i=0; i < 50; i++) {
        promises.push(DistributedRateLimiter.checkLimit(
            tenantId,
            'CONCURRENT_TEST',
            'EXECUTE',
            limit,
            windowSecs,
            undefined,
            userId
        ));
    }
    
    const results = await Promise.all(promises);
    const allowedCount = results.filter(r => r.allowed).length;
    const blockedCount = results.filter(r => !r.allowed).length;
    
    // In a perfectly atomic system, exactly 10 should be allowed. 
    // In an in-memory test without a strict lock, there might be slight variations, but it should definitely block most.
    expect(allowedCount).toBeLessThanOrEqual(limit);
    expect(blockedCount).toBeGreaterThanOrEqual(40);
  });
});
