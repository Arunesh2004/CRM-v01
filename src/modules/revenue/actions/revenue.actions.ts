'use server'
import { withServerActionContext } from '@/lib/observability/server-action';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { RevenueService } from '../revenue.service';

async function _getQuotesAction() {
  try {
    const tenantId = await requireTenant();
    const session = await requireAuth();
    const result = await RevenueService.getQuotes(tenantId, session.userId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getQuotesAction = withServerActionContext(_getQuotesAction);
