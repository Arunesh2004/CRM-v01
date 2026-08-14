import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { exportTenant } from '@/modules/recovery/export.engine';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { getIncidentsCsv, getCustomersCsv, getCommunicationsCsv } from '@/modules/reporting/export.service';
import { PrismaClient } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');

    const startDate = start ? new Date(start) : undefined;
    const endDate = end ? new Date(end) : undefined;

    let csv = '';
    let filename = '';

    if (type === 'diagnostic') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any = {};
      try {
        const startInit = performance.now();
        const prismaDiag = new PrismaClient({ log: ['warn', 'error'] });
        results.initTime = performance.now() - startInit;

        const startFirst = performance.now();
        await prismaDiag.$queryRaw`SELECT 1`;
        results.firstTime = performance.now() - startFirst;

        const startSecond = performance.now();
        await prismaDiag.$queryRaw`SELECT 1`;
        results.secondTime = performance.now() - startSecond;

        const startSeq = performance.now();
        await prismaDiag.$queryRaw`SELECT pg_sleep(1)`;
        await prismaDiag.$queryRaw`SELECT pg_sleep(1)`;
        results.seqTime = performance.now() - startSeq;

        const startConc = performance.now();
        await Promise.all([
          prismaDiag.$queryRaw`SELECT pg_sleep(1)`,
          prismaDiag.$queryRaw`SELECT pg_sleep(1)`
        ]);
        results.concTime = performance.now() - startConc;

        const startConc3 = performance.now();
        await Promise.all([
          prismaDiag.$queryRaw`SELECT pg_sleep(1)`,
          prismaDiag.$queryRaw`SELECT pg_sleep(1)`,
          prismaDiag.$queryRaw`SELECT pg_sleep(1)`
        ]);
        results.conc3Time = performance.now() - startConc3;

        const startConc5 = performance.now();
        await Promise.all([
          prismaDiag.$queryRaw`SELECT pg_sleep(1)`,
          prismaDiag.$queryRaw`SELECT pg_sleep(1)`,
          prismaDiag.$queryRaw`SELECT pg_sleep(1)`,
          prismaDiag.$queryRaw`SELECT pg_sleep(1)`,
          prismaDiag.$queryRaw`SELECT pg_sleep(1)`
        ]);
        results.conc5Time = performance.now() - startConc5;
        
        await prismaDiag.$disconnect();
      } catch(e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        results.error = e.message;
      }
      return NextResponse.json(results);
    }

    if (type === 'incidents') {
      csv = await getIncidentsCsv(startDate, endDate);
      filename = 'incidents_export.csv';
    } else if (type === 'customers') {
      csv = await getCustomersCsv(startDate, endDate);
      filename = 'customers_export.csv';
    } else if (type === 'communications') {
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
