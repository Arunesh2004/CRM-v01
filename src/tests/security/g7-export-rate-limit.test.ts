import { describe, it, expect, vi } from 'vitest';
import { GET } from '@/app/api/export/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'user-1' }),
  requireTenant: vi.fn().mockResolvedValue('tenant-1'),
  requirePermission: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/modules/reporting/export.service', () => ({
  getIncidentsCsv: vi.fn().mockResolvedValue('test,csv'),
}));

vi.mock('@/lib/logger/logger', () => ({
  Logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));

const mockLimit = vi.fn();

vi.mock('@/lib/cache/redis.client', () => ({
  rateLimiters: {
    export: {
      limit: (...args: any[]) => mockLimit(...args)
    }
  }
}));

describe('G7: Export Rate Limiting Security', () => {
  it('allows request when within limit', async () => {
    mockLimit.mockResolvedValueOnce({ success: true });
    
    const req = new NextRequest('http://localhost/api/export?type=incidents');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockLimit).toHaveBeenCalledWith('export:tenant-1:user-1');
  });

  it('blocks request when limit exceeded', async () => {
    mockLimit.mockResolvedValueOnce({ success: false });
    
    const req = new NextRequest('http://localhost/api/export?type=incidents');
    const res = await GET(req);
    expect(res.status).toBe(429);
  });

  it('fails closed when limiter throws', async () => {
    mockLimit.mockRejectedValueOnce(new Error('Redis failure'));
    
    const req = new NextRequest('http://localhost/api/export?type=incidents');
    const res = await GET(req);
    expect(res.status).toBe(503);
  });
});
