import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';
import { rateLimiters } from '@/lib/cache/redis.client';

/**
 * SECURITY MIDDLEWARE
 *
 * Phase 2 Remediation: Native Auth middleware.
 * - Sets all mandatory security headers on every response.
 * - Removes the Vercel-default wildcard CORS header from non-API routes.
 * - Includes Upstash rate-limiting logic per-route.
 * - Redirects unauthenticated access to /sign-in using native crm_session cookie presence.
 */

const publicRoutePatterns = [
  /^\/$/,
  /^\/sign-in(.*)$/,
  /^\/sign-up(.*)$/,
  /^\/unauthorized(.*)$/,
  /^\/api\/health(.*)$/,
  /^\/api\/live(.*)$/,
  /^\/api\/ready(.*)$/,
  /^\/api\/webhooks\/(.*)$/,
  /^\/api\/inngest$/,
  /^\/api\/auth\/(.*)$/, // Native Auth Endpoints
];

function isPublicRoute(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  return publicRoutePatterns.some(pattern => pattern.test(pathname));
}

function isLoadTestAuthEnabled(): boolean {
  console.log('[MIDDLEWARE] NODE_ENV:', process.env.NODE_ENV);
  console.log('[MIDDLEWARE] CRM_LOAD_TEST_AUTH_ENABLED:', process.env.CRM_LOAD_TEST_AUTH_ENABLED);
  console.log('[MIDDLEWARE] LOAD_TEST_SECRET:', process.env.LOAD_TEST_SECRET ? 'present' : 'missing');
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') return false;
  if (process.env.CRM_LOAD_TEST_AUTH_ENABLED?.trim() !== 'true') return false;
  if (!process.env.LOAD_TEST_SECRET) return false;
  return true;
}

function isLoadTestRequest(req: Request): boolean {
  if (!isLoadTestAuthEnabled()) return false;
  if (!req.headers.get('x-load-test-token')) return false;
  return true;
}

function applySecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  const scriptSrc = isProduction
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-eval' 'unsafe-inline'";

  const csp = [
    "default-src 'self'",
    scriptSrc,
    "connect-src 'self'",
    "frame-src 'self'",
    "worker-src 'self' blob:",
    "img-src 'self' data:",
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

const handleRateLimiting = async (request: NextRequest, ip: string) => {
  let limiter = null;
  let isHighRisk = false;

  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/api/auth') // Native Auth handles its own Application Rate Limiting
  ) {
    return null;
  }

  if (pathname.startsWith('/api/webhooks/')) {
    limiter = rateLimiters.webhook;
  } else if (pathname.startsWith('/api/ai') || pathname.startsWith('/assistant')) {
    limiter = rateLimiters.ai;
    isHighRisk = true;
  } else if (pathname.startsWith('/billing') || pathname.startsWith('/api/billing')) {
    limiter = rateLimiters.api;
    if (request.method === 'POST') {
      isHighRisk = true;
    }
  } else if (pathname.startsWith('/api/quotes')) {
    limiter = rateLimiters.api;
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      isHighRisk = true;
    }
  } else if (pathname.startsWith('/api/')) {
    limiter = rateLimiters.api;
  }

  if (isHighRisk && !limiter) {
    return new NextResponse('Service Unavailable (Rate Limiting Offline)', { status: 503 });
  }

  if (limiter) {
    try {
      const { success } = await limiter.limit(ip);
      if (!success) {
        return new NextResponse('Too Many Requests', { status: 429 });
      }
    } catch (error) {
      if (isHighRisk) {
        return new NextResponse('Service Unavailable', { status: 503 });
      }
    }
  }
  return null;
};

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

  const rateLimitResponse = await handleRateLimiting(request, ip);
  if (rateLimitResponse) return rateLimitResponse;

  if (isLoadTestRequest(request)) {
    const response = NextResponse.next();
    return applySecurityHeaders(response, request);
  }

  if (!isPublicRoute(request)) {
    // Check for native crm_session cookie presence
    const hasNativeSessionCookie = request.cookies.has('crm_session');

    if (!hasNativeSessionCookie) {
      const signInUrl = new URL('/sign-in', request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  const response = NextResponse.next();
  return applySecurityHeaders(response, request);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
