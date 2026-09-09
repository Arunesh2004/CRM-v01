'use server'
import { withServerActionContext } from '@/lib/observability/server-action';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant } from '@/lib/auth';
import { TicketService } from '../ticket.service';

async function _getTicketsAction() {
  try {
    const tenantId = await requireTenant();
    const session = await requireAuth();
    const result = await TicketService.getTickets(tenantId, session.id);
    return { success: true, data: result };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
async function _createTicketAction(payload: any) {
  try {
    const tenantId = await requireTenant();
    const session = await requireAuth();

    const { idempotencyKey, ...ticketData } = payload;
    
    const result = await TicketService.createTicket(
      tenantId, 
      session.id, 
      ticketData.customerId, 
      ticketData.subject, 
      ticketData.description, 
      ticketData.priority,
      undefined,
      idempotencyKey
    );
    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _getTicketByIdAction(ticketId: string) {
  try {
    const tenantId = await requireTenant();
    const session = await requireAuth();
    const result = await TicketService.getTicketById(tenantId, session.id, ticketId);
    return { success: true, data: result };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getTicketsAction = withServerActionContext(_getTicketsAction);

export const createTicketAction = withServerActionContext(_createTicketAction);

export const getTicketByIdAction = withServerActionContext(_getTicketByIdAction);
