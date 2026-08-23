import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { exportTenant } from '@/modules/recovery/export.engine';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { getIncidentsCsv, getCustomersCsv, getCommunicationsCsv } from '@/modules/reporting/export.service';
import { Resource, Action } from '@prisma/client';
import { executeAsSystem, SystemOperation } from '@/../database/utils/prisma-system';

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');

    const startDate = start ? new Date(start) : undefined;
    const endDate = end ? new Date(end) : undefined;

    let csv = '';
    let filename = '';

    if (type === 'diagnostic') {
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

      } catch(e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
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
  } catch (error: any) {
    return NextResponse.json({ error: sanitizeClientError(error) }, { status: 500 });
  }
}
