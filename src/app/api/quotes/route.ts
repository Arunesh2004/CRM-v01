import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireTenant, requirePermissionFast } from '@/lib/auth';
import prisma from '@/../database/utils/prisma';
import { RevenueService } from '@/modules/revenue/revenue.service';
import { Logger } from '@/lib/logger/logger';

export async function GET(req: NextRequest) {
  try {
    const { id: userId } = await requireAuth();
    const tenantId = await requireTenant();
    const quotes = await RevenueService.getQuotes(tenantId, userId);

    return NextResponse.json(quotes);
  } catch (error: any) {
    Logger.error('[API] GET Quotes failed', error);
    if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
