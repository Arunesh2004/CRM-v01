import { describe, it, expect, vi, beforeEach } from 'vitest';
import proxyMiddleware from '../../proxy';
import { NextRequest, NextResponse } from 'next/server';

// Mock @clerk/nextjs/server
vi.mock('@clerk/nextjs/server', () => {
  return {
    clerkMiddleware: (handler: any) => handler,
    createRouteMatcher: () => (req: any) => false,
  };
});

// Mock NextRequest and NextResponse
vi.mock('next/server', () => {
  class MockNextResponse {
    status?: number;
    headers: Headers;
    body: any;
    constructor(body?: any, init?: any) {
      this.body = body;
      this.status = init?.status;
      this.headers = new Headers(init?.headers);
    }
    static next() {
      const res = new MockNextResponse();
      res.headers = new Headers();
      return res;
    }
  }
  return {
    NextResponse: MockNextResponse,
    NextRequest: class MockNextRequest {
      nextUrl: { pathname: string };
      headers: Headers;
      method: string;
      constructor(url: string, init?: any) {
        this.nextUrl = { pathname: url.replace('http://localhost', '') };
        this.headers = new Headers(init?.headers);
        this.method = init?.method || 'GET';
      }
    },
  };
});

// Mock redis client
vi.mock('../../lib/cache/redis.client', () => {
  return {
    rateLimiters: {
      auth: null, // Redis unavailable
      ai: null,
      api: null,
      webhook: null,
    },
    redis: null,
  };
});

describe('S16.1A Scoped Degraded Rate Limiter Policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const runMiddleware = async (pathname: string, method = 'GET') => {
    const req = new NextRequest(`http://localhost${pathname}`, { method, headers: { 'x-forwarded-for': '127.0.0.1' } });
    const auth = { protect: vi.fn() };
    
    // Call the clerk middleware handler
    const response = await (proxyMiddleware as any)(auth, req);
    return { response, auth };
  };

  it('B. Redis UNAVAILABLE: /sign-in is allowed to continue (degraded mode)', async () => {
    const { response } = await runMiddleware('/sign-in');
    expect(response).toBeDefined();
    expect(response.status).toBeUndefined(); // Didn't return 503
  });

  it('B. Redis UNAVAILABLE: /api/ai fails closed securely', async () => {
    const { response } = await runMiddleware('/api/ai');
    expect(response.status).toBe(503);
  });

  it('B. Redis UNAVAILABLE: /billing POST fails closed securely', async () => {
    const { response } = await runMiddleware('/billing', 'POST');
    expect(response.status).toBe(503);
  });

  it('C. Protected CRM route (/dashboard) enforces authentication', async () => {
    const { response, auth } = await runMiddleware('/dashboard');
    expect(auth.protect).toHaveBeenCalled();
    expect(response.status).toBeUndefined();
  });
});
