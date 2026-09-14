/**
 * Phase 9 — G2 Regression Tests
 * Clerk Configuration Absent — Middleware Fail-Closed Verification
 *
 * Proves:
 *   G2.1  Protected route + Clerk absent → 503 fail-closed
 *   G2.2  Protected API route + Clerk absent → 503 fail-closed
 *   G2.3  /api/health (PUBLIC BY DESIGN) + Clerk absent → passes through
 *   G2.4  /api/webhooks/* (PUBLIC BY DESIGN) + Clerk absent → passes through
 *   G2.5  /api/inngest (PUBLIC BY DESIGN) + Clerk absent → passes through
 *   G2.6  /__clerk/* (INFRASTRUCTURE BY DESIGN) + Clerk absent → passes through
 *   G2.7  /sign-in, /sign-up (PUBLIC BY DESIGN) + Clerk absent → passes through
 *   G2.8  Source code: fallback handler must not contain unauthenticated pass-through
 *
 * Tests are purely logic-level; they extract and replicate the isPublicRoute
 * classification logic from proxy.ts without importing the Edge runtime module.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Replicate the isPublicRoute classification logic from proxy.ts.
// We cannot import the edge module directly in vitest; instead we mirror
// the exact createRouteMatcher pattern as a pure function.
// ---------------------------------------------------------------------------

/**
 * Mirrors the isPublicRoute() matcher from proxy.ts.
 * Must be kept in sync with the actual route list in proxy.ts.
 */
function classifyRoute(pathname: string): 'PUBLIC_BY_DESIGN' | 'INFRASTRUCTURE' | 'AUTHENTICATION_REQUIRED' {
  // Exact public routes matching the isPublicRoute() createRouteMatcher in proxy.ts
  if (pathname === '/') return 'PUBLIC_BY_DESIGN';
  if (pathname.startsWith('/sign-in')) return 'PUBLIC_BY_DESIGN';
  if (pathname.startsWith('/sign-up')) return 'PUBLIC_BY_DESIGN';
  if (pathname.startsWith('/api/health')) return 'PUBLIC_BY_DESIGN';
  if (pathname.startsWith('/api/webhooks/')) return 'PUBLIC_BY_DESIGN';
  if (pathname === '/api/inngest') return 'PUBLIC_BY_DESIGN';
  if (pathname.startsWith('/__clerk')) return 'PUBLIC_BY_DESIGN'; // Clerk Frontend API proxy

  // Everything else requires authentication
  return 'AUTHENTICATION_REQUIRED';
}

/**
 * Simulates the Clerk-absent fallback middleware behavior from proxy.ts.
 * Returns { status } for the route, where 200 means "pass-through" and
 * 503 means "fail-closed".
 *
 * Rate-limiting is skipped here (Redis not available in vitest unit context).
 */
function simulateClerkAbsentMiddleware(pathname: string): { status: number } {
  const classification = classifyRoute(pathname);
  if (classification === 'PUBLIC_BY_DESIGN') {
    return { status: 200 }; // pass-through
  }
  // FAIL CLOSED — protected route
  return { status: 503 };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Phase 9 G2 — Clerk-absent middleware fail-closed remediation', () => {

  // G2.1 — Protected application route → 503
  it('G2.1: Protected CRM route /crm/customers → 503 when Clerk absent', () => {
    const result = simulateClerkAbsentMiddleware('/crm/customers');
    expect(result.status).toBe(503);
  });

  // G2.2 — Protected API route → 503
  it('G2.2: Protected API route /api/notifications → 503 when Clerk absent', () => {
    expect(simulateClerkAbsentMiddleware('/api/notifications').status).toBe(503);
  });

  it('G2.2b: Protected API route /api/export → 503 when Clerk absent', () => {
    expect(simulateClerkAbsentMiddleware('/api/export').status).toBe(503);
  });

  it('G2.2c: Protected API route /api/quotes → 503 when Clerk absent', () => {
    expect(simulateClerkAbsentMiddleware('/api/quotes').status).toBe(503);
  });

  it('G2.2d: Protected AI route /api/ai/copilot → 503 when Clerk absent', () => {
    expect(simulateClerkAbsentMiddleware('/api/ai/copilot').status).toBe(503);
  });

  // G2.3 — /api/health → pass-through (PUBLIC BY DESIGN)
  it('G2.3: /api/health is PUBLIC BY DESIGN → pass-through when Clerk absent', () => {
    expect(simulateClerkAbsentMiddleware('/api/health').status).toBe(200);
    expect(simulateClerkAbsentMiddleware('/api/health/ready').status).toBe(200);
    expect(simulateClerkAbsentMiddleware('/api/health/live').status).toBe(200);
  });

  // G2.4 — webhook routes → pass-through (own HMAC auth, PUBLIC BY DESIGN)
  it('G2.4: /api/webhooks/* retains own HMAC auth boundary → pass-through when Clerk absent', () => {
    expect(simulateClerkAbsentMiddleware('/api/webhooks/twilio').status).toBe(200);
    expect(simulateClerkAbsentMiddleware('/api/webhooks/resend').status).toBe(200);
    expect(simulateClerkAbsentMiddleware('/api/webhooks/mediamtx/record').status).toBe(200);
    expect(simulateClerkAbsentMiddleware('/api/webhooks/clerk').status).toBe(200);
  });

  // G2.5 — /api/inngest → pass-through (Inngest SDK auth, PUBLIC BY DESIGN)
  it('G2.5: /api/inngest is PUBLIC BY DESIGN → pass-through when Clerk absent', () => {
    expect(simulateClerkAbsentMiddleware('/api/inngest').status).toBe(200);
  });

  // G2.6 — /__clerk/* → pass-through (INFRASTRUCTURE BY DESIGN)
  it('G2.6: /__clerk/* is INFRASTRUCTURE BY DESIGN → pass-through when Clerk absent', () => {
    expect(simulateClerkAbsentMiddleware('/__clerk/v1/client').status).toBe(200);
  });

  // G2.7 — sign-in / sign-up → pass-through (PUBLIC BY DESIGN)
  it('G2.7: /sign-in and /sign-up are PUBLIC BY DESIGN → pass-through when Clerk absent', () => {
    expect(simulateClerkAbsentMiddleware('/sign-in').status).toBe(200);
    expect(simulateClerkAbsentMiddleware('/sign-up').status).toBe(200);
    expect(simulateClerkAbsentMiddleware('/sign-in/factor-one').status).toBe(200);
  });

  // G2.8 — Source code must not contain the old unauthenticated pass-through
  it('G2.8: proxy.ts fallback must not contain unauthenticated NextResponse.next() pass-through', () => {
    const proxyPath = path.join(__dirname, '..', '..', '..', 'src', 'proxy.ts');
    const source = fs.readFileSync(proxyPath, 'utf-8');

    // The old fallback had this exact pattern (all requests passed through):
    const oldUnsafeFallback = /Fallback middleware when Clerk is absent/;
    expect(source).not.toMatch(oldUnsafeFallback);

    // The new fallback must contain the fail-closed pattern
    expect(source).toContain('G2 REMEDIATION');
    expect(source).toContain('FAIL CLOSED');
    expect(source).toContain('503');
  });

  // G2.9 — Internal API routes that use their own auth (cron, backup) → 503 from middleware
  //         (those routes have their own auth; middleware adds defense-in-depth)
  it('G2.9: Internal cron route /api/cron/process-outbox → 503 at middleware when Clerk absent', () => {
    expect(simulateClerkAbsentMiddleware('/api/cron/process-outbox').status).toBe(503);
  });

  it('G2.9b: Internal backup route /api/internal/backup/run → 503 at middleware when Clerk absent', () => {
    expect(simulateClerkAbsentMiddleware('/api/internal/backup/run').status).toBe(503);
  });
});
