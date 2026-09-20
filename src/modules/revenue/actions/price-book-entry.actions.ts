'use server';
import { withServerActionContext } from '@/lib/observability/server-action';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant } from '@/lib/auth';
import { PriceBookEntryService, priceBookEntryCreateSchema, priceBookEntryUpdateSchema } from '../price-book-entry.service';
import { z } from 'zod';

async function _getPriceBookEntriesAction(priceBookId: string) {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();
    
    const entries = await PriceBookEntryService.getPriceBookEntries(tenantId, user.id, priceBookId);
    return { success: true, data: entries };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _createPriceBookEntryAction(data: z.infer<typeof priceBookEntryCreateSchema>) {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();
    
    const entry = await PriceBookEntryService.createPriceBookEntry(tenantId, user.id, data);
    return { success: true, data: entry };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _updatePriceBookEntryAction(entryId: string, data: z.infer<typeof priceBookEntryUpdateSchema>) {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();
    
    const entry = await PriceBookEntryService.updatePriceBookEntry(tenantId, user.id, entryId, data);
    return { success: true, data: entry };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getPriceBookEntriesAction = withServerActionContext(_getPriceBookEntriesAction);
export const createPriceBookEntryAction = withServerActionContext(_createPriceBookEntryAction);
export const updatePriceBookEntryAction = withServerActionContext(_updatePriceBookEntryAction);
