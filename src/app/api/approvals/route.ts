import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { requireAuth, requireTenant, requirePermissionFast } from '@/lib/auth';
import prisma from '@db/utils/prisma';
import { ApprovalService } from '@/modules/approvals/approval.service';
import { Logger } from '@/lib/logger/logger';

const _orig_GET = async function (req: NextRequest) {
  try {
    const { id: userId } = await requireAuth();
    const tenantId = await requireTenant();
    
    // Anyone can read their own approvals, admins can read all.
    // For simplicity of minimum viable API, we'll fetch those assigned to user.
    const approvals = await ApprovalService.getPendingApprovals(tenantId, userId);

    return NextResponse.json(approvals);
  } catch (error: any) {
    Logger.error('[API] GET Approvals failed', error);
    if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withApiContext(_orig_GET);
