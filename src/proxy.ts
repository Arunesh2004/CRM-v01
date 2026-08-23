import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimiters } from '@/lib/cache/redis.client';

/**
 * SECURITY MIDDLEWARE
 *
 * Phase 13 remediation for HDR-01 and HDR-02:
 * - Sets all mandatory security headers on every response.
 * - Removes the Vercel-default wildcard CORS header from non-API routes.
 * - Integrates with Clerk authentication for protected routes.
 * - Includes Upstash rate-limiting logic per-route.
 */

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
  '/api/webhooks/(.*)',
  '/api/inngest',
]);

function isLoadTestAuthEnabled(): boolean {
  if (process.env.VERCEL_ENV !== 'preview') return false;
  if (process.env.CRM_LOAD_TEST_AUTH_ENABLED !== 'true') return false;
  if (!process.env.LOAD_TEST_SECRET) return false;
  return true;
}

function isLoadTestRequest(req: Request): boolean {
  if (!isLoadTestAuthEnabled()) return false;
  if (!req.headers.get('x-load-test-token')) return false;
  return true;
}

function applySecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.com https://*.clerk.com https://*.clerk.accounts.dev https://js.stripe.com",
    "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://api.stripe.com wss://*.clerk.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "worker-src 'self' blob:",
    "img-src 'self' data: https://img.clerk.com",
    "style-src 'self' 'unsafe-inline'",
  ].join('; ');

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith('/api/webhooks') && !pathname.startsWith('/api/health')) {
    response.headers.delete('Access-Control-Allow-Origin');
  }

  return response;
}

const hasClerkKeys = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith('<');

const handleRateLimiting = async (request: NextRequest, ip: string) => {
  let limiter = null;
  if (request.nextUrl.pathname.startsWith('/api/webhooks/')) {
    limiter = rateLimiters.webhook;
  } else if (request.nextUrl.pathname.startsWith('/api/ai') || request.nextUrl.pathname.startsWith('/assistant')) {
    limiter = rateLimiters.ai;
  } else if (request.nextUrl.pathname.startsWith('/api/')) {
    limiter = rateLimiters.api;
  } else if (request.nextUrl.pathname.startsWith('/sign-in') || request.nextUrl.pathname.startsWith('/sign-up')) {
    limiter = rateLimiters.auth;
  }

  if (limiter) {
    const { success } = await limiter.limit(ip);
    if (!success) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }
  return null;
};

const middlewareHandler = async (auth: any, request: NextRequest) => {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  
  const rateLimitResponse = await handleRateLimiting(request, ip);
  if (rateLimitResponse) return rateLimitResponse;

  if (isLoadTestRequest(request)) {
    const response = NextResponse.next();
    return applySecurityHeaders(response, request);
  }

  if (auth && !isPublicRoute(request)) {
    await auth.protect();
  }

  const response = NextResponse.next();
  return applySecurityHeaders(response, request);
};

export default hasClerkKeys 
  ? clerkMiddleware(middlewareHandler)
  : async (request: NextRequest) => {
      // Fallback middleware when Clerk is absent
      const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
      const rateLimitResponse = await handleRateLimiting(request, ip);
      if (rateLimitResponse) return rateLimitResponse;
      
      const response = NextResponse.next();
      return applySecurityHeaders(response, request);
    };

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
