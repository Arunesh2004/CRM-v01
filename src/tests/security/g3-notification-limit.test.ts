import { describe, it, expect, vi } from 'vitest';
import { GET } from '@/app/api/notifications/route';
import { NextRequest } from 'next/server';

// Mock auth
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'user-1' }),
  requireTenant: vi.fn().mockResolvedValue('tenant-1'),
}));

vi.mock('@/modules/notifications/notification.service', () => ({
  NotificationService: {
    getNotifications: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/logger/logger', () => ({
  Logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));

function makeRequest(limitStr: string) {
  const url = `http://localhost/api/notifications?limit=${limitStr}`;
  return new NextRequest(url);
}

describe('G3: Notification Limit Security', () => {
  it('rejects negative limits', async () => {
    const res = await GET(makeRequest('-10'));
    expect(res.status).toBe(400);
  });

  it('rejects zero limit', async () => {
    const res = await GET(makeRequest('0'));
    expect(res.status).toBe(400);
  });

  it('rejects excessively large limits', async () => {
    const res = await GET(makeRequest('999999'));
    expect(res.status).toBe(400);
  });

  it('rejects NaN / malformed limits', async () => {
    const res = await GET(makeRequest('drop_table'));
    expect(res.status).toBe(400);
  });

  it('accepts valid limits within bounds', async () => {
    const res = await GET(makeRequest('50'));
    expect(res.status).toBe(200);
  });
});
