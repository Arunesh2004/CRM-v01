'use server';

import { requireAuth, requireTenant } from '@/lib/auth';
import { globalSearch } from '../search.service';

export async function searchAction(query: string) {
  try {
    await requireAuth();
    const tenantId = await requireTenant();
    
    if (!query || query.trim().length < 2) {
      return { success: true, data: [] };
    }

    const results = await globalSearch(tenantId, query.trim());
    return { success: true, data: results };
  } catch (error: any) {
    return { success: false, error: error.message || 'Search failed' };
  }
}
