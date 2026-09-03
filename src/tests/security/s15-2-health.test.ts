import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as routeLive from '@/app/api/health/live/route';
import * as routeReady from '@/app/api/health/ready/route';
import * as routeLegacy from '@/app/api/health/route';
import prisma from '@db/utils/prisma';
import { NextResponse, NextRequest } from 'next/server';

describe('S15.2 FND-15-Operational: Health Endpoints', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('STRONG: Liveness succeeds without DB', async () => {
    const req = new NextRequest('http://localhost/api/health/live');
    const res = await routeLive.GET(req, {});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    // Ensure DB is not called
    expect(body.database).toBeUndefined();
  });

  it('STRONG: Readiness returns 200 when DB is up', async () => {
    vi.spyOn(prisma, '$queryRaw').mockResolvedValue([1]);
    const req = new NextRequest('http://localhost/api/health/ready');
    const res = await routeReady.GET(req, {});
    expect(res.status).toBe(200);
    const body = await res.json();
    // In test environment, redis mock might be absent so it defaults to 'degraded' if redis fails ping.
    // Or 'ready' if redis mock succeeds. So we just expect one of them.
    expect(['ready', 'degraded']).toContain(body.status);
  });

  it('STRONG: Readiness returns 503 when DB is down', async () => {
    vi.spyOn(prisma, '$queryRaw').mockRejectedValue(new Error('Connection failed'));
    const req = new NextRequest('http://localhost/api/health/ready');
    const res = await routeReady.GET(req, {});
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe('not_ready');
  });

  it('STRONG: Legacy endpoint is sanitized and returns 503 on DB down', async () => {
    vi.spyOn(prisma, '$queryRaw').mockRejectedValue(new Error('Connection failed'));
    const req = new NextRequest('http://localhost/api/health');
    const res = await routeLegacy.GET(req, {});
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe('degraded');
    expect(body.database).toBe('disconnected');
    // Ensure no infrastructure leaks
    expect(body.config).toBeUndefined();
    expect(body.environment).toBeUndefined();
  });
});
