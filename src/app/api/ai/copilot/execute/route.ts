import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { requireAuth, requireTenant } from '@/lib/auth';
import { Logger } from '@/lib/logger/logger';
import prisma from '@db/utils/prisma';
import { ToolRegistry } from '@/modules/ai/tools/registry';
import { ContextBuilderService } from '@/modules/ai/context/context-builder.service';

const _orig_POST = async function (req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>> | null = null;
  let tenantId: string | null = null;
  
  try {
    user = await requireAuth();
    tenantId = await requireTenant();

    const body: any = await req.json();
    const { executionId, action } = body;

    if (!executionId || !action || !['CONFIRM', 'CANCEL'].includes(action)) {
      return NextResponse.json({ error: 'Invalid execution payload' }, { status: 400 });
    }

    if (action === 'CANCEL') {
      const updated = await prisma.aIExecution.updateMany({
        where: { id: executionId, status: 'PENDING', tenantId: tenantId!, userId: user.id },
        data: { status: 'REJECTED' }
      });
      if (updated.count === 0) {
        return NextResponse.json({ error: 'Execution not found or cannot be cancelled' }, { status: 404 });
      }
      return NextResponse.json({ success: true, status: 'CANCELLED' });
    }

    // Atomic Claim: PENDING -> IN_PROGRESS
    const claimed = await prisma.$executeRaw`
      UPDATE "AIExecution"
      SET "status" = 'IN_PROGRESS'
      WHERE "id" = ${executionId} 
        AND "status" = 'PENDING' 
        AND "tenantId" = ${tenantId} 
        AND "userId" = ${user.id}
    `;

    if (claimed === 0) {
      // Check if it already exists as IN_PROGRESS (perhaps we are retrying a crashed request)
      const existing = await prisma.aIExecution.findUnique({ where: { id: executionId } });
      if (!existing || existing.tenantId !== tenantId || existing.userId !== user.id) {
         return NextResponse.json({ error: 'Execution not found or unauthorized' }, { status: 404 });
      }
      if (existing.status !== 'IN_PROGRESS') {
         return NextResponse.json({ error: `Execution cannot be claimed in status ${existing.status}` }, { status: 409 });
      }
      // If it's IN_PROGRESS, allow it to proceed for idempotency recovery.
    }

    const execution = await prisma.aIExecution.findUnique({
      where: { id: executionId },
      include: { tool: true }
    });

    if (!execution || !execution.tool) {
      return NextResponse.json({ error: 'Execution or Tool not found' }, { status: 404 });
    }

    const aiContext = await ContextBuilderService.buildUserContext(tenantId!, user.id);
    let parsedInput: Record<string, unknown> = {};
    try {
      parsedInput = JSON.parse(typeof execution.input === 'string' ? execution.input : JSON.stringify(execution.input));
    } catch(e) {
      // Safe fallback
    }

    // Re-evaluate ABAC/RBAC and execute CRM mutation idempotently
    try {
      // The idempotency key ensures the CRM mutation inside tool.execute doesn't repeat if it already succeeded.
      // We pass the executionId into the args payload so the underlying CRM service can use it as idempotency key.
      const result = await ToolRegistry.executeTool(
        execution.tool.name, 
        { ...parsedInput, idempotencyKey: execution.id }, 
        aiContext
      );

      await prisma.aIExecution.update({
        where: { id: executionId },
        data: { status: 'COMPLETED', output: JSON.stringify(result) }
      });

      return NextResponse.json({ success: true, result });
    } catch(err: any) {
      await prisma.aIExecution.update({
        where: { id: executionId },
        data: { status: 'FAILED', output: err.message }
      });
      Logger.error('[API] Execution Failed', err, { executionId });
      
      if (err.message?.includes('unauthorized') || err.message?.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized: You do not have permission for this action.' }, { status: 403 });
      }
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

  } catch (error: any) {
    Logger.error('[API] Copilot Execute failed', error);
    if (error.message?.includes('unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'Unauthorized or forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withApiContext(_orig_POST);
