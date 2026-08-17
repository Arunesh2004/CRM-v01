import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { rateLimiters } from '@/lib/cache/redis.client';

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/api/webhooks/clerk', '/api/health']);

/**
 * STAGING-ONLY LOAD-TEST GATE
 *
 * This gate is active ONLY when ALL of the following are true:
 *   1. NODE_ENV is NOT 'production'
 *   2. CRM_LOAD_TEST_AUTH_ENABLED is explicitly 'true'
 *   3. The request carries the x-load-test-token header
 *
 * If any condition is false, execution falls through to normal Clerk protection.
 * Production fails CLOSED — the gate is completely inert in production.
 *
 * NOTE: The token is NOT verified here (edge runtime does not support Node.js crypto).
 * Full cryptographic verification happens in getCurrentUser() in auth.ts (Node.js runtime).
 * This gate only allows the request to reach the Server Action for token verification.
 */
function isLoadTestAuthEnabled(): boolean {
  // Gate condition 1: Only allow on Vercel Preview (blocks production and unknown envs)
  if (process.env.VERCEL_ENV !== 'preview') return false;
  // Gate condition 2: Must have an explicit opt-in env var
  if (process.env.CRM_LOAD_TEST_AUTH_ENABLED !== 'true') return false;
  // Gate condition 3: Must have the cryptographic secret configured
  if (!process.env.LOAD_TEST_SECRET) return false;
  return true;
}

function isLoadTestRequest(req: Request): boolean {
  if (!isLoadTestAuthEnabled()) return false;
  // Gate condition 4: Must carry the dedicated header (presence check only; content verified later)
  if (!req.headers.get('x-load-test-token')) return false;
  return true;
}

export default clerkMiddleware(async (auth, req) => {
  // Rate limiting logic
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  let limiter = null;

  if (req.nextUrl.pathname.startsWith('/api/webhooks/')) {
    limiter = rateLimiters.webhook;
  } else if (req.nextUrl.pathname.startsWith('/api/ai') || req.nextUrl.pathname.startsWith('/assistant')) {
    limiter = rateLimiters.ai;
  } else if (req.nextUrl.pathname.startsWith('/api/')) {
    limiter = rateLimiters.api;
  } else if (req.nextUrl.pathname.startsWith('/sign-in') || req.nextUrl.pathname.startsWith('/sign-up')) {
    limiter = rateLimiters.auth;
  }

  if (limiter) {
    const { success } = await limiter.limit(ip);
    if (!success) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }

  // Allow the load-test request to bypass Clerk protection on staging only.
  // The actual token verification and user resolution happen in getCurrentUser().
  if (isLoadTestRequest(req)) {
    return NextResponse.next();
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }

});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
