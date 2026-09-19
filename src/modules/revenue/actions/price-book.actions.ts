'use server';
import { withServerActionContext } from '@/lib/observability/server-action';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant } from '@/lib/auth';
import { PriceBookService, priceBookCreateSchema, priceBookUpdateSchema } from '../price-book.service';
import { z } from 'zod';

async function _getPriceBooksAction() {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();
    
    const priceBooks = await PriceBookService.getPriceBooks(tenantId, user.id);
    return { success: true, data: priceBooks };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _createPriceBookAction(data: z.infer<typeof priceBookCreateSchema>) {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();
    
    const priceBook = await PriceBookService.createPriceBook(tenantId, user.id, data);
    return { success: true, data: priceBook };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _updatePriceBookAction(priceBookId: string, data: z.infer<typeof priceBookUpdateSchema>) {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();
    
    const priceBook = await PriceBookService.updatePriceBook(tenantId, user.id, priceBookId, data);
    return { success: true, data: priceBook };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _deactivatePriceBookAction(priceBookId: string) {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();
    
    const priceBook = await PriceBookService.deactivatePriceBook(tenantId, user.id, priceBookId);
    return { success: true, data: priceBook };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getPriceBooksAction = withServerActionContext(_getPriceBooksAction);
export const createPriceBookAction = withServerActionContext(_createPriceBookAction);
export const updatePriceBookAction = withServerActionContext(_updatePriceBookAction);
export const deactivatePriceBookAction = withServerActionContext(_deactivatePriceBookAction);
