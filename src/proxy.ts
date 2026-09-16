import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';
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
  '/unauthorized(.*)',
  '/api/health(.*)',
  '/api/live(.*)',
  '/api/ready(.*)',
  '/api/webhooks/(.*)',
  '/api/inngest',
  '/__clerk(.*)',  // Clerk Frontend API proxy — must be public to avoid sign-in redirect loop
]);


function isLoadTestAuthEnabled(): boolean {
  console.log('[MIDDLEWARE] NODE_ENV:', process.env.NODE_ENV);
  console.log('[MIDDLEWARE] CRM_LOAD_TEST_AUTH_ENABLED:', process.env.CRM_LOAD_TEST_AUTH_ENABLED);
  console.log('[MIDDLEWARE] LOAD_TEST_SECRET:', process.env.LOAD_TEST_SECRET);
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
    ? "script-src 'self' 'unsafe-inline' https://clerk.com https://*.clerk.com https://*.clerk.accounts.dev"
    : "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.com https://*.clerk.com https://*.clerk.accounts.dev";

  const csp = [
    "default-src 'self'",
    scriptSrc,
    "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev wss://*.clerk.com",
    "frame-src 'self'",
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
  let isHighRisk = false;

  const pathname = request.nextUrl.pathname;

  // Clerk authentication pages (/sign-in, /sign-up, /__clerk proxy) must NOT be
  // application rate-limited. Clerk's sign-in page makes multiple sub-requests
  // during initialization (JS chunks, Clerk API calls) and a 10 req/min bucket
  // would exhaust before the page renders, producing a 429 for the end user.
  // Clerk's own platform-level DDoS protection applies to these endpoints.
  if (
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/__clerk')
  ) {
    return null; // No application rate limiting — let Clerk handle it
  }

  if (pathname.startsWith('/api/webhooks/')) {
    limiter = rateLimiters.webhook;
  } else if (pathname.startsWith('/api/ai') || pathname.startsWith('/assistant')) {
    limiter = rateLimiters.ai;
    isHighRisk = true;
  } else if (pathname.startsWith('/billing') || pathname.startsWith('/api/billing')) {
    limiter = rateLimiters.api;
    // Mutative operations (POST/Server Actions) on billing are high risk (fail-closed)
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
    // If Redis is not configured, we must fail closed for high-risk endpoints.
    // Edge middleware memory fallback is effectively useless due to short-lived isolates.
    return new NextResponse('Service Unavailable (Rate Limiting Offline)', { status: 503 });
  }

  if (limiter) {
    try {
      const { success } = await limiter.limit(ip);
      if (!success) {
        return new NextResponse('Too Many Requests', { status: 429 });
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
    } catch (error) {
      // On Redis failure, high-risk fails closed, low-risk degrades (fails open)
      if (isHighRisk) {
        return new NextResponse('Service Unavailable', { status: 503 });
      }
    }
  }
  return null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload — typed Prisma/API result shape requires architectural schema work deferred to S3
const middlewareHandler = async (auth: any, request: NextRequest) => {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  
  const rateLimitResponse = await handleRateLimiting(request, ip);
  if (rateLimitResponse) return rateLimitResponse;

  if (isLoadTestRequest(request)) {
    const response = NextResponse.next();
    return applySecurityHeaders(response, request);
  }

  if (auth && !isPublicRoute(request)) {
    const authObj = typeof auth === 'function' ? auth() : auth;
    if (!authObj?.userId) {
      const signInUrl = new URL('/sign-in', request.url);
      return NextResponse.redirect(signInUrl);
    }
    // Only call protect() if they are logged in, to enforce roles if any (none currently)
    if (typeof authObj.protect === 'function') {
      authObj.protect();
    }
  }

  const response = NextResponse.next();
  return applySecurityHeaders(response, request);
};

/**
 * G2 REMEDIATION — Clerk configuration absent fallback.
 *
 * When Clerk publishable/secret keys are not present this deployment is
 * misconfigured and MUST NOT allow protected application routes to be
 * accessed without identity verification.
 *
 * Route classification when Clerk is absent:
 *   PUBLIC BY DESIGN      — routes in isPublicRoute() (health, webhooks,
 *                           inngest, sign-in, sign-up, __clerk proxy)
 *   INFRASTRUCTURE BY DESIGN — static assets excluded by config.matcher
 *   AUTHENTICATION REQUIRED  — everything else → fail-closed (503)
 *
 * 503 is chosen over 401/403: the server cannot authenticate because it is
 * misconfigured, not because the caller lacks credentials.
 */
const baseMiddleware = hasClerkKeys
  ? clerkMiddleware(middlewareHandler)
  : async (request: NextRequest) => {
      const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
      const rateLimitResponse = await handleRateLimiting(request, ip);
      if (rateLimitResponse) return rateLimitResponse;

      if (isPublicRoute(request)) {
        const response = NextResponse.next();
        return applySecurityHeaders(response, request);
      }

      return new NextResponse(
        JSON.stringify({ error: 'Service Unavailable: Authentication provider not configured.' }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isLoadTestRequest(request)) {
    // Completely bypass Clerk for load tests to prevent handshake redirect crashes
    const response = NextResponse.next();
    return applySecurityHeaders(response, request);
  }
  
  return baseMiddleware(request, event);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
