'use server'
'use server'
import { withServerActionContext } from '@/lib/observability/server-action';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant } from '@/lib/auth';
import { RevenueService } from '../revenue.service';

async function _getQuotesAction() {
  try {
    const tenantId = await requireTenant();
    const session = await requireAuth();
    const result = await RevenueService.getQuotes(tenantId, session.id);
    return { success: true, data: serializeDecimal(result) };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getQuotesAction = withServerActionContext(_getQuotesAction);

import { revalidatePath } from 'next/cache';

import { serializeDecimal } from '@/lib/utils/decimal';

async function _createQuoteAction(payload: { dealId: string, customerId: string, priceBookId: string, lineItems: { priceBookEntryId: string, quantity: number, discount: number }[] }) {
  try {
    const tenantId = await requireTenant();
    const session = await requireAuth();
    
    // RevenueService does permission checking internally
    const result = await RevenueService.createQuote(
      tenantId, 
      session.id, 
      payload.dealId, 
      payload.customerId, 
      payload.priceBookId, 
      payload.lineItems
    );
    revalidatePath('/quotes');
    return { success: true, data: serializeDecimal(result) };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const createQuoteAction = withServerActionContext(_createQuoteAction);

async function _submitQuoteForApprovalAction(quoteId: string) {
  try {
    const tenantId = await requireTenant();
    const session = await requireAuth();
    const result = await RevenueService.submitForApproval(tenantId, session.id, quoteId);
    revalidatePath(`/quotes/${quoteId}`);
    return { success: true, data: serializeDecimal(result) };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const submitQuoteForApprovalAction = withServerActionContext(_submitQuoteForApprovalAction);

async function _approveQuoteAction(quoteId: string) {
  try {
    const tenantId = await requireTenant();
    const session = await requireAuth();
    const result = await RevenueService.approveQuote(tenantId, session.id, quoteId);
    revalidatePath(`/quotes/${quoteId}`);
    return { success: true, data: serializeDecimal(result) };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const approveQuoteAction = withServerActionContext(_approveQuoteAction);

async function _sendQuoteAction(quoteId: string) {
  try {
    const tenantId = await requireTenant();
    const session = await requireAuth();
    const result = await RevenueService.sendQuote(tenantId, session.id, quoteId);
    revalidatePath(`/quotes/${quoteId}`);
    return { success: true, data: serializeDecimal(result) };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const sendQuoteAction = withServerActionContext(_sendQuoteAction);

async function _acceptQuoteAction(quoteId: string) {
  try {
    const tenantId = await requireTenant();
    const session = await requireAuth();
    const result = await RevenueService.acceptQuote(tenantId, session.id, quoteId);
    revalidatePath(`/quotes/${quoteId}`);
    return { success: true, data: serializeDecimal(result) };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const acceptQuoteAction = withServerActionContext(_acceptQuoteAction);

async function _createQuoteRevisionAction(quoteId: string) {
  try {
    const tenantId = await requireTenant();
    const session = await requireAuth();
    const result = await RevenueService.createQuoteRevision(tenantId, session.id, quoteId);
    revalidatePath(`/quotes/${quoteId}`);
    revalidatePath(`/quotes`);
    return { success: true, data: serializeDecimal(result) };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const createQuoteRevisionAction = withServerActionContext(_createQuoteRevisionAction);
