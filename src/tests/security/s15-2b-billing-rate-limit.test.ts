import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
// We must mock the redis client BEFORE importing proxy
vi.mock('../../lib/cache/redis.client', () => {
  return {
    rateLimiters: {
      api: {
        limit: vi.fn().mockRejectedValue(new Error('Redis connection failed'))
      },
      webhook: {
        limit: vi.fn().mockRejectedValue(new Error('Redis connection failed'))
      }
    }
  };
});
import * as proxy from '../../proxy';

describe('S15.2B Billing Rate Limit Policy', () => {
  // Test that when Redis fails, mutative billing routes fail closed
  it('should fail-closed for POST requests to /billing during Redis outage', async () => {
    const req = new NextRequest('http://localhost/billing/plans', { method: 'POST' });
    const res = await (proxy as any).default(req, {});
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(text).toContain('Service Unavailable');
  });

  // Test that GET requests to /billing degrade (fail open) during Redis outage
  it('should degrade (fail-open) for GET requests to /billing during Redis outage', async () => {
    const req = new NextRequest('http://localhost/billing/plans', { method: 'GET' });
    const res = await (proxy as any).default(req, {});
    // When failing open, the proxy returns a 200 response with clerk headers
    expect(res).toBeDefined();
    expect(res.status).toBe(200);
  });

  it('should fail-closed for mutative requests to /api/quotes during Redis outage', async () => {
    const req = new NextRequest('http://localhost/api/quotes', { method: 'POST' });
    const res = await (proxy as any).default(req, {});
    expect(res.status).toBe(503);
  });
});
