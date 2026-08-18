'use server'

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { RevenueService } from '../revenue.service';

export async function getQuotesAction() {
  try {
    const tenantId = await requireTenant();
    const session = await requireAuth();
    const result = await RevenueService.getQuotes(tenantId, session.userId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
