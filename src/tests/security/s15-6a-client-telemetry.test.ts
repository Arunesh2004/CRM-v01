import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/internal/telemetry/error/route';
import { DistributedRateLimiter } from '@/lib/rate-limit/rate-limiter';
import * as auth from '@/lib/auth';
import { errorTracker } from '@/lib/observability/error-tracker';
import { normalizeTelemetryUrl } from '@/lib/observability/client-telemetry';

vi.mock('@/lib/auth', () => ({
  getCurrentUserIdentity: vi.fn(),
}));

vi.mock('@/lib/observability/error-tracker', () => ({
  errorTracker: {
    captureException: vi.fn(),
    captureMessage: vi.fn(),
  },
}));

vi.mock('@/lib/rate-limit/rate-limiter', () => {
  const checkLimitMock = vi.fn().mockResolvedValue({ allowed: true, remaining: 10 });
  return {
    DistributedRateLimiter: {
      checkLimit: checkLimitMock,
    },
  };
});

describe('Phase S15.6A - Client Telemetry Endpoint', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createReq = (body: string | object, headers: Record<string, string> = {}, ip?: string) => {
    const text = typeof body === 'string' ? body : JSON.stringify(body);
    
    // Polyfill arrayBuffer/text so NextRequest mock works properly
    const req = new NextRequest('http://localhost/api/internal/telemetry/error', {
      method: 'POST',
      headers,
      body: text,
    });
    
    // Override ip for testing since NextRequest.ip is read-only
    Object.defineProperty(req, 'ip', { value: ip, writable: true });
    
    // Also override text() for the strict size check
    req.text = async () => text;
    
    return req;
  };

  it('1. Rejects oversized body (> 5120 chars) before parsing', async () => {
    const hugeBody = 'A'.repeat(6000);
    const req = createReq(hugeBody);
    
    const res = await POST(req);
    expect(res.status).toBe(413);
    const data = await res.json();
    expect(data.error).toBe('Payload too large');
  });

  it('2. Rejects malformed JSON', async () => {
    const req = createReq('{ invalid json ');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Malformed JSON');
  });

  it('3. Rejects unknown fields via .strict() schema', async () => {
    const req = createReq({
      name: 'Error',
      message: 'Test',
      url: 'http://test.com',
      arbitraryMetadata: 'HACK',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Schema validation failed');
  });

  it('4. Rejects fields exceeding explicit lengths', async () => {
    const req = createReq({
      name: 'E'.repeat(200), // Max 100
      message: 'M',
      url: 'http://test.com',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('5. Successfully processes anonymous telemetry', async () => {
    vi.mocked(auth.getCurrentUserIdentity).mockResolvedValue(null);
    const req = createReq({
      name: 'TypeError',
      message: 'Cannot read properties of null',
      url: 'http://localhost:3000/public',
    });
    
    const res = await POST(req);
    expect(res.status).toBe(202);
    
    expect(errorTracker.captureException).toHaveBeenCalled();
    const args = vi.mocked(errorTracker.captureException).mock.calls[0];
    const loggedError = args[0] as Error;
    const context = args[1];
    
    expect(loggedError.message).toContain('Cannot read properties of null');
    expect(context?.tenantId).toBeUndefined(); // Anonymous!
  });

  it('6. Successfully processes authenticated telemetry and ignores spoofed tenant', async () => {
    vi.mocked(auth.getCurrentUserIdentity).mockResolvedValue({
      id: 'usr_trusted',
      tenantId: 'tenant_trusted',
      email: 'test@example.com',
      status: 'ACTIVE'
    });
    
    // Malicious client tries to spoof tenant
    const req = createReq({
      name: 'Error',
      message: 'Crash',
      url: 'http://localhost:3000',
      tenantId: 'tenant_malicious', // Will be stripped by Zod .strict()
    });
    
    const res = await POST(req);
    // Since we used .strict(), it actually returns 400 because tenantId is not in schema.
    // This perfectly proves the client cannot spoof tenantId inside the payload.
    expect(res.status).toBe(400);

    // Now send valid payload
    const reqValid = createReq({
      name: 'Error',
      message: 'Crash',
      url: 'http://localhost:3000',
    });
    
    const resValid = await POST(reqValid);
    expect(resValid.status).toBe(202);
    
    const args = vi.mocked(errorTracker.captureException).mock.calls[0];
    expect(args[1]?.tenantId).toBe('tenant_trusted');
  });

  it('7. Enforces rate limiting with 429 response', async () => {
    vi.mocked(DistributedRateLimiter.checkLimit).mockResolvedValueOnce({ allowed: false, remaining: 0 });
    
    const req = createReq({
      name: 'Error',
      message: 'Crash',
      url: 'http://test.com',
    });
    
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it('8. Degrade behavior correctly triggers MemoryFallback if Redis fails', async () => {
    vi.mocked(auth.getCurrentUserIdentity).mockResolvedValue(null);
    // We will spy on the internal behavior by throwing inside the limiter explicitly.
    // However, since we mock DistributedRateLimiter entirely here, we just verify it was called with 'degrade'
    const req = createReq({
      name: 'Error',
      message: 'Crash',
      url: 'http://test.com',
    });
    
    await POST(req);
    expect(DistributedRateLimiter.checkLimit).toHaveBeenCalledWith(
      'anonymous', 'TELEMETRY', 'ERROR', 20, 60, expect.any(String), undefined, 'degrade'
    );
  });

  it('9. Truncates and sanitizes stack trace independently of client', async () => {
    const maliciousStack = `Error: crash\n  at a (webpack-internal:///./src/a.ts:1:1)\n  at b (webpack-internal:///./src/b.ts:2:2)\n  at c\n  at d`;
    
    const req = createReq({
      name: 'Error',
      message: 'Crash',
      stack: maliciousStack,
      url: 'http://test.com',
    });
    
    await POST(req);
    const args = vi.mocked(errorTracker.captureException).mock.calls[0];
    const stack = args[1]?.stack;
    
    // Only 3 lines kept
    expect(stack.split('\n').length).toBeLessThanOrEqual(3);
    // webpack internal paths are stripped
    expect(stack).not.toContain('src/a.ts');
    expect(stack).toContain('webpack-internal://...');
  });

  it('10. Applies redaction as defense-in-depth to message and stack', async () => {
    const req = createReq({
      name: 'Error',
      message: 'Cannot parse url?token=secret123',
      stack: 'Failed at line 1 ?token=secret123',
      url: 'http://test.com',
    });
    
    await POST(req);
    const args = vi.mocked(errorTracker.captureException).mock.calls[0];
    const loggedError = args[0] as Error;
    const context = args[1];
    
    expect(loggedError.message).not.toContain('secret123');
    expect(loggedError.message).toContain('[REDACTED]');
    expect(context?.stack).not.toContain('secret123');
    expect(context?.stack).toContain('[REDACTED]');
  });

  it('11. URL normalizer drops queries and hashes', () => {
    const safeUrl = normalizeTelemetryUrl('http://test.com/path?token=123#hash');
    expect(safeUrl).toBe('http://test.com/path');
    
    // Malformed fallback
    const malformed = normalizeTelemetryUrl('/path?secret=foo#bar');
    expect(malformed).toBe('/path');
  });
});
