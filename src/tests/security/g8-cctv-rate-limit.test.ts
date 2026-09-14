import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateStreamToken } from '@/modules/cctv/stream.service';
import { rateLimiters } from '@/lib/cache/redis.client';
import * as auth from '@/lib/auth';
import { ENV } from '@/lib/config/env';

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
  requireTenant: vi.fn(),
  requirePermission: vi.fn()
}));

vi.mock('@db/utils/prisma', () => ({
  default: {
    $transaction: vi.fn()
  }
}));

vi.mock('@/lib/config/env', () => ({
  ENV: {
    cctvEnabled: true,
    mediamtxApiUrl: 'http://localhost:8889',
    publicAppUrl: 'http://localhost:3000'
  }
}));

describe('G8: CCTV WHEP Stream Token Rate Limiting', () => {
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';
  const mockCameraId = 'cam-789';

  beforeEach(() => {
    vi.clearAllMocks();
    (auth.requireAuth as any).mockResolvedValue({ id: mockUserId });
    (auth.requireTenant as any).mockResolvedValue(mockTenantId);
    (auth.requirePermission as any).mockResolvedValue(true);
  });

  it('rejects with rate limit error when limit is exceeded', async () => {
    if (rateLimiters.cctvStream) {
       vi.spyOn(rateLimiters.cctvStream, 'limit').mockResolvedValueOnce({ success: false } as any);
       
       await expect(generateStreamToken(mockCameraId)).rejects.toThrow('Too many stream requests. Please wait before requesting a new stream token.');
       
       expect(rateLimiters.cctvStream.limit).toHaveBeenCalledWith(`${mockTenantId}:${mockUserId}:${mockCameraId}`);
    }
  });

  it('fails closed when rate limiter throws an unexpected error', async () => {
    if (rateLimiters.cctvStream) {
       vi.spyOn(rateLimiters.cctvStream, 'limit').mockRejectedValueOnce(new Error('Redis connection lost'));
       
       await expect(generateStreamToken(mockCameraId)).rejects.toThrow('Stream token service temporarily unavailable due to rate limiter outage.');
    }
  });
});
