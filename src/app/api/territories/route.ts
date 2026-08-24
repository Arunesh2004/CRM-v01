import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireTenant, requirePermissionFast } from '@/lib/auth';
import prisma from '@db/utils/prisma';
import { TerritoryService } from '@/modules/sales-intel/territory.service';
import { Logger } from '@/lib/logger/logger';

export async function GET(req: NextRequest) {
  try {
    const { id: userId } = await requireAuth();
    const tenantId = await requireTenant();
    const territories = await TerritoryService.getTerritories(tenantId, userId);

    return NextResponse.json(territories);
  } catch (error: any) {
    Logger.error('[API] GET Territories failed', error);
    if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
