import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { exportTenant } from '@/modules/recovery/export.engine';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { getIncidentsCsv, getCustomersCsv, getCommunicationsCsv } from '@/modules/reporting/export.service';

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
