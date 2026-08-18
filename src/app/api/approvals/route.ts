import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireTenant, requirePermissionFast } from '@/lib/auth';
import prisma from '@/../database/utils/prisma';
import { ApprovalService } from '@/modules/approvals/approval.service';
import { Logger } from '@/lib/logger/logger';

export async function GET(req: NextRequest) {
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
