import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { getIncidentsCsv, getCustomersCsv, getCommunicationsCsv, getQuotesCsv } from '@/modules/reporting/export.service';
import { Resource, Action } from '@prisma/client';
import { parseDateRange } from '@/lib/utils/date-range';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { rateLimiters } from '@/lib/cache/redis.client';
import { Logger } from '@/lib/logger/logger';

const _orig_GET = async function (req: NextRequest) {
  try {
    const authUser = await requireAuth();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const start = searchParams.get('startDate') || searchParams.get('start');
    const end = searchParams.get('endDate') || searchParams.get('end');

    const { startDate, endDate, error: dateError } = parseDateRange(start, end);

    if (dateError) {
      return NextResponse.json({ error: dateError }, { status: 400 });
    }

    // G7 Remediation: Fail-closed strict rate limit scoped to authenticated identity
    if (!rateLimiters.export) {
      Logger.error('Rate limiting unavailable (fail-closed export)', { userId: authUser.id });
      return NextResponse.json({ error: 'Service Unavailable' }, { status: 503 });
    }

    // Limit by tenant + user to prevent evasion
    const tenantId = await requireTenant();
    const rateLimitKey = `export:${tenantId}:${authUser.id}`;
    
    try {
      const { success } = await rateLimiters.export.limit(rateLimitKey);
      if (!success) {
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
      }
    } catch (limiterErrorRaw: unknown) {
      const limiterError = limiterErrorRaw instanceof Error ? limiterErrorRaw : new Error(String(limiterErrorRaw));
      Logger.error('Rate limiter exception (fail-closed export)', { error: limiterError.message, userId: authUser.id });
      return NextResponse.json({ error: 'Service Unavailable' }, { status: 503 });
    }

    let csv = '';
    let filename = '';

    if (type === 'diagnostic') {
       
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
      const isGlobalAdmin = authUser.userRoles.some((ur: any) => ur.role.name === 'GLOBAL_ADMIN');
      if (!isGlobalAdmin) {
        return NextResponse.json({ error: 'Forbidden: Requires GLOBAL_ADMIN' }, { status: 403 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any = {};
      try {
        const startInit = performance.now();
        results.initTime = performance.now() - startInit;

        const startFirst = performance.now();
        await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.$queryRaw`SELECT 1`);
        results.firstTime = performance.now() - startFirst;

        const startSecond = performance.now();
        await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.$queryRaw`SELECT 1`);
        results.secondTime = performance.now() - startSecond;

        const startSeq = performance.now();
        await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
          await tx.$queryRaw`SELECT pg_sleep(1)`;
          await tx.$queryRaw`SELECT pg_sleep(1)`;
        });
        results.seqTime = performance.now() - startSeq;

        const startConc = performance.now();
        await Promise.all([
          executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.$queryRaw`SELECT pg_sleep(1)`),
          executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.$queryRaw`SELECT pg_sleep(1)`)
        ]);
        results.concTime = performance.now() - startConc;

        const startConc3 = performance.now();
        await Promise.all([
          executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.$queryRaw`SELECT pg_sleep(1)`),
          executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.$queryRaw`SELECT pg_sleep(1)`),
          executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.$queryRaw`SELECT pg_sleep(1)`)
        ]);
        results.conc3Time = performance.now() - startConc3;

        const startConc5 = performance.now();
        await Promise.all([
          executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.$queryRaw`SELECT pg_sleep(1)`),
          executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.$queryRaw`SELECT pg_sleep(1)`),
          executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.$queryRaw`SELECT pg_sleep(1)`),
          executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.$queryRaw`SELECT pg_sleep(1)`),
          executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.$queryRaw`SELECT pg_sleep(1)`)
        ]);
        results.conc5Time = performance.now() - startConc5;

      } catch(eRaw: unknown) {
        const e = eRaw instanceof Error ? eRaw : new Error(String(eRaw));  
        results.error = e.message;
      }
      return NextResponse.json(results);
    }

    if (type === 'incidents') {
      await requireTenant();
      await requirePermission(Resource.INCIDENT, Action.READ);
      csv = await getIncidentsCsv(startDate, endDate);
      filename = 'incidents_export.csv';
    } else if (type === 'customers') {
      await requireTenant();
      await requirePermission(Resource.CUSTOMER, Action.READ);
      csv = await getCustomersCsv(startDate, endDate);
      filename = 'customers_export.csv';
    } else if (type === 'communications') {
      await requireTenant();
      await requirePermission(Resource.COMMUNICATION, Action.READ);
      csv = await getCommunicationsCsv(startDate, endDate);
      filename = 'communications_export.csv';
    } else if (type === 'quotes') {
      await requireTenant();
      await requirePermission(Resource.REVENUE, Action.READ);
      csv = await getQuotesCsv(startDate, endDate);
      filename = 'quote_revenue_export.csv';
    } else {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return NextResponse.json({ error: sanitizeClientError(error) }, { status: 500 });
  }
}

export const GET = withApiContext(_orig_GET);
