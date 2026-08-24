'use server';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';

export async function getApprovalsAction() {
  try {
    const tenantId = await requireTenant();
    await requireAuth();
    const prisma = withTenant(tenantId);
    
    // In a real app we'd have an ApprovalService
    // For now we just query workflows or quotes that are PENDING_APPROVAL
    const pendingQuotes = await prisma.quote.findMany({
      where: { tenantId, status: 'PENDING_APPROVAL' },
      include: { customer: true, deal: true, owner: true }
    });

    return { success: true, data: pendingQuotes };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
