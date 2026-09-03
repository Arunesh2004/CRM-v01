import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { requireAuth, requireTenant } from '@/lib/auth';
import { CopilotService } from '@/modules/ai/copilot/copilot.service';
import { Logger } from '@/lib/logger/logger';

const _orig_POST = async function (req: NextRequest) {
  try {
    const { id: userId } = await requireAuth();
    const tenantId = await requireTenant();

    const body: any = await req.json();
    const { message, history } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const response = await CopilotService.handleChat(tenantId, userId, message, history || []);
    return NextResponse.json(response);

  } catch (error: any) {
    Logger.error('[API] Copilot Chat failed', error);
    
    if (error.message?.includes('unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'Unauthorized or forbidden' }, { status: 403 });
    }
    
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withApiContext(_orig_POST);
