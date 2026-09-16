import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { requireAuth, requireTenant } from '@/lib/auth';
import { RevenueService } from '@/modules/revenue/revenue.service';
import { Logger } from '@/lib/logger/logger';

 
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
const _orig_GET = async function (req: NextRequest) {
  try {
    const { id: userId } = await requireAuth();
    const tenantId = await requireTenant();
    const quotes = await RevenueService.getQuotes(tenantId, userId);

    return NextResponse.json(quotes);
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    Logger.error('[API] GET Quotes failed', error);
    if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withApiContext(_orig_GET);
