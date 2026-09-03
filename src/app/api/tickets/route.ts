import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { requireAuth, requireTenant, requirePermissionFast } from '@/lib/auth';
import prisma from '@db/utils/prisma';
import { TicketService } from '@/modules/support/ticket.service';
import { Logger } from '@/lib/logger/logger';

const _orig_GET = async function (req: NextRequest) {
  try {
    const { id: userId } = await requireAuth();
    const tenantId = await requireTenant();
    const tickets = await TicketService.getTickets(tenantId, userId);

    return NextResponse.json(tickets);
  } catch (error: any) {
    Logger.error('[API] GET Tickets failed', error);
    if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withApiContext(_orig_GET);
