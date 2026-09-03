/**
 * S15.2D: Health / Readiness Test
 *
 * Dependency Policy under test:
 *   - PostgreSQL: CORE — failure causes 503
 *   - Redis: NON-CORE — absence reports 'degraded' in body but still returns 200
 *     (because core CRM serving works without Redis; only high-risk endpoints are degraded)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockPrisma = {
  $queryRaw: vi.fn(),
};

const mockRedis = {
  ping: vi.fn(),
};

let redisEnabled = true;

vi.mock('@db/utils/prisma', () => ({
  default: mockPrisma
}));

vi.mock('@/lib/cache/redis.client', () => ({
  get redis() {
    return redisEnabled ? mockRedis : null;
  }
}));

vi.mock('@/lib/observability/context', () => ({
  withApiContext: (handler: any) => handler,
  withContext: (ctx: any, fn: any) => fn(),
  getContext: () => ({ requestId: 'test-req-id' }),
}));

describe('S15.2D — Health / Readiness Probe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisEnabled = true;
  });
  
  afterEach(() => {
    redisEnabled = true;
  });

  it('should return 200 ready when PostgreSQL and Redis are both healthy', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    mockRedis.ping.mockResolvedValueOnce('PONG');

    const { GET } = await import('@/app/api/health/ready/route');
    const res = await (GET as any)();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('ready');
    expect(body.components.postgres).toBe('ok');
    expect(body.components.redis).toBe('ok');
  });

  it('should return 503 when PostgreSQL is unavailable', async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('DB connection refused'));
    // Redis doesn't matter here since Postgres failed, but we provide it for completeness
    mockRedis.ping.mockResolvedValueOnce('PONG');

    const { GET } = await import('@/app/api/health/ready/route');
    const res = await (GET as any)();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe('not_ready');
    expect(body.components.postgres).toBe('unavailable');
    expect(JSON.stringify(body)).not.toMatch(/postgres:\/\//);
  });

  it('should return 200 degraded when Redis is unavailable but PostgreSQL is healthy', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    mockRedis.ping.mockRejectedValueOnce(new Error('Redis timeout'));

    const { GET } = await import('@/app/api/health/ready/route');
    const res = await (GET as any)();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('degraded');
    expect(body.components.postgres).toBe('ok');
    expect(body.components.redis).toBe('unavailable');
  });

  it('should return 200 degraded when Redis is completely unconfigured', async () => {
    redisEnabled = false;
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

    const { GET } = await import('@/app/api/health/ready/route');
    const res = await (GET as any)();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('degraded');
    expect(body.components.redis).toBe('unconfigured');
  });

  it('should NOT expose credentials or internal topology in health response', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    mockRedis.ping.mockResolvedValueOnce('PONG');

    const { GET } = await import('@/app/api/health/ready/route');
    const res = await (GET as any)();
    const body = await res.json();
    const bodyStr = JSON.stringify(body);

    expect(bodyStr).not.toMatch(/password/i);
    expect(bodyStr).not.toMatch(/secret/i);
    expect(bodyStr).not.toMatch(/DATABASE_URL/i);
    expect(bodyStr).not.toMatch(/REDIS_URL/i);
    expect(bodyStr).not.toMatch(/stack/i);
    expect(bodyStr).not.toMatch(/at Object\./);
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('components');
  });
});
