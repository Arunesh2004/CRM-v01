import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import proxy, { config } from '@/middleware';
import { POST as LoginPOST } from '@/app/api/auth/login/route';
import { POST as LogoutPOST } from '@/app/api/auth/logout/route';
import * as sessionLib from '@/lib/auth/session';
import { DistributedRateLimiter } from '@/lib/rate-limit/rate-limiter';
import * as authLib from '@/lib/auth';
import * as passwordLib from '@/lib/auth/password';

vi.mock('next/headers', () => {
  return {
    headers: vi.fn().mockResolvedValue(new Map([['x-forwarded-for', '127.0.0.1']])),
    cookies: vi.fn().mockResolvedValue({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }),
  };
});

vi.mock('@/lib/auth/session', () => ({
  revokeCurrentSession: vi.fn(),
  createSession: vi.fn(),
}));

vi.mock('@/lib/rate-limit/rate-limiter', () => ({
  DistributedRateLimiter: {
    checkLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
  }
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUserIdentity: vi.fn(),
}));

vi.mock('@/lib/auth/password', () => ({
  verifyDummyPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock('@db/utils/prisma-system', () => ({
  executeAsSystem: vi.fn().mockImplementation(async (op, cb) => {
    // mock tx
    const tx = {
      securityEvent: {
        create: vi.fn()
      },
      user: {
        findFirst: vi.fn().mockResolvedValue(null)
      }
    };
    return cb(tx);
  }),
  SystemOperation: {
    AUTH_BOOTSTRAP: 'AUTH_BOOTSTRAP'
  }
}));

describe('Phase 2: Native Auth UI & Middleware Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.CRM_LOAD_TEST_AUTH_ENABLED = 'false';
  });

  describe('Middleware Routing and Security', () => {
    it('1. Unauthenticated protected request/navigation redirects to /sign-in', async () => {
      const req = new NextRequest('http://localhost/dashboard');
      // No crm_session cookie
      const res = await proxy(req, {} as any);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/sign-in');
    });

    it('2. Native authenticated session is allowed to proceed', async () => {
      const req = new NextRequest('http://localhost/dashboard');
      req.cookies.set('crm_session', 'mock-session-token');
      const res = await proxy(req, {} as any);
      // NextResponse.next() doesn't have a 307 redirect
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('8. No migrated Phase 2 path requires Clerk (Public routes are accessible)', async () => {
      const publicRoutes = ['/', '/sign-in', '/sign-up', '/unauthorized', '/api/health'];
      for (const route of publicRoutes) {
        const req = new NextRequest(`http://localhost${route}`);
        const res = await proxy(req, {} as any);
        expect(res.status).toBe(200); // Should not redirect to /sign-in
      }
    });
  });

  describe('Login Route', () => {
    it('4. Native login succeeds with valid credentials', async () => {
      const mockReq = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': '127.0.0.1' },
        body: JSON.stringify({ email: 'valid@example.com', password: 'password123' })
      });

      const txMock = {
        user: { findFirst: vi.fn().mockResolvedValue({ id: '123', status: 'ACTIVE', passwordHash: 'hash', tenantId: 't1' }) },
        securityEvent: { create: vi.fn() }
      };

      const { executeAsSystem } = await import('@db/utils/prisma-system');
      vi.mocked(executeAsSystem).mockImplementationOnce(async (op, cb) => cb(txMock as any)).mockImplementationOnce(async (op, cb) => cb(txMock as any));

      vi.mocked(passwordLib.verifyPassword).mockResolvedValueOnce(true);

      const res = await LoginPOST(mockReq);
      expect(res.status).toBe(200);
      expect(sessionLib.createSession).toHaveBeenCalledWith('123');
    });

    it('5. Invalid credentials remain generic', async () => {
      const mockReq = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': '127.0.0.1' },
        body: JSON.stringify({ email: 'invalid@example.com', password: 'wrong' })
      });

      const res = await LoginPOST(mockReq);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Invalid credentials');
    });

    it('6. Rate limiting remains enforced', async () => {
      vi.mocked(DistributedRateLimiter.checkLimit).mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: 0 });

      const mockReq = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': '127.0.0.1' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
      });

      const res = await LoginPOST(mockReq);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toContain('Too many attempts');
    });
  });

  describe('Logout Route', () => {
    it('7. Logout revokes the server-side session', async () => {
      const mockReq = new NextRequest('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: { 'x-forwarded-for': '127.0.0.1' }
      });

      vi.mocked(authLib.getCurrentUserIdentity).mockResolvedValueOnce({ id: '123', tenantId: 't1' } as any);

      const res = await LogoutPOST(mockReq);
      expect(res.status).toBe(200);
      expect(sessionLib.revokeCurrentSession).toHaveBeenCalled();
    });
  });
});
