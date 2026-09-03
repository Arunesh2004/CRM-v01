'use server';
import { withServerActionContext } from '@/lib/observability/server-action';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';


import { requireAuth, requireTenant } from '@/lib/auth';
import { globalSearch } from '../search.service';

async function _searchAction(query: string) {
  try {
    await requireAuth();
    const tenantId = await requireTenant();
    
    if (!query || query.trim().length < 2) {
      return { success: true, data: [] };
    }

    const user = await requireAuth();
    const results = await globalSearch(tenantId, query.trim(), user.id);
    return { success: true, data: results };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const searchAction = withServerActionContext(_searchAction);
