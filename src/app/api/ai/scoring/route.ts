import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { requireAuth, requireTenant } from '@/lib/auth';
import { ScoringService } from '@/modules/ai/scoring/scoring.service';
import { Logger } from '@/lib/logger/logger';

const _orig_POST = async function (req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const tenantId = await requireTenant();

    const body: any = await req.json();
    const { resourceType, resourceId } = body;

    if (!resourceType || !resourceId) {
      return NextResponse.json({ error: 'Missing resourceType or resourceId' }, { status: 400 });
    }

    if (resourceType === 'DEAL') {
      const result = await ScoringService.calculateDealProbability(tenantId, userId, resourceId);
      return NextResponse.json(result);
    } 
    
    if (resourceType === 'LEAD') {
      const result = await ScoringService.calculateLeadScore(tenantId, userId, resourceId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unsupported resourceType' }, { status: 400 });

  } catch (error: any) {
    Logger.error('[API] AI Scoring failed', error);
    
    // Distinguish between authorization/not found vs internal error
    if (error.message?.includes('unauthorized') || error.message?.includes('Permission denied')) {
      return NextResponse.json({ error: 'Unauthorized or forbidden' }, { status: 403 });
    }
    
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withApiContext(_orig_POST);
