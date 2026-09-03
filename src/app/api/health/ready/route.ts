import { withApiContext } from '@/lib/observability/context';
import { NextResponse } from 'next/server';
import prisma from '@db/utils/prisma';
import { redis } from '@/lib/cache/redis.client';

/**
 * READINESS PROBE
 *
 * Dependency Policy:
 *
 * CORE SERVING (required for readiness):
 *   - PostgreSQL: All CRM data, auth, tenant resolution. Failure = NOT READY.
 *
 * HIGH-RISK ENDPOINT CAPABILITY (optional for core serving):
 *   - Redis (Upstash): Required for rate-limiting on billing/auth/AI routes.
 *     These routes fail-closed (503) when Redis is unavailable.
 *     However, the core CRM workload (customer data, deals, docs, search) remains
 *     functional because:
 *       (a) Auth falls back to a direct DB query when Redis cache is absent.
 *       (b) Low-risk route rate-limiters fail-open, maintaining read availability.
 *     Therefore Redis is NOT a global readiness requirement, but its absence
 *     is reported as a 'degraded' component so operators know high-risk routes
 *     are currently fail-closed.
 *
 * This decision means:
 *   Redis absent or unreachable => readiness = 200 with status.redis = 'degraded'
 *   (not 503, because core serving still works)
 *
 *   PostgreSQL absent or unreachable => readiness = 503
 */

const original_GET = async function () {
  const components: Record<string, string> = {};
  let coreReady = true;

  // 1. PostgreSQL — core dependency
  try {
    await prisma.$queryRaw`SELECT 1`;
    components.postgres = 'ok';
  } catch {
    components.postgres = 'unavailable';
    coreReady = false;
  }

  // 2. Redis — high-risk endpoint capability (not core)
  if (!redis) {
    // Unconfigured: high-risk routes are fail-closed, but core CRM serving works
    components.redis = 'unconfigured';
  } else {
    try {
      await redis.ping();
      components.redis = 'ok';
    } catch {
      components.redis = 'unavailable';
    }
  }

  if (!coreReady) {
    return NextResponse.json({
      status: 'not_ready',
      components,
      // Do not expose connection strings, credentials, or topology details
    }, { status: 503 });
  }

  const overallStatus = components.redis === 'ok' ? 'ready' : 'degraded';

  return NextResponse.json({
    status: overallStatus,
    components,
  }, { status: 200 });
};

export const GET = withApiContext(original_GET);
