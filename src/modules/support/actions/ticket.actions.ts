'use server'
import { withServerActionContext } from '@/lib/observability/server-action';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { TicketService } from '../ticket.service';

async function _getTicketsAction() {
  try {
    const tenantId = await requireTenant();
    const session = await requireAuth();
    const result = await TicketService.getTickets(tenantId, session.userId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _createTicketAction(payload: any) {
  try {
    const tenantId = await requireTenant();
    const session = await requireAuth();
    const result = await TicketService.createTicket(
      tenantId, 
      session.userId, 
      payload.customerId, 
      payload.subject, 
      payload.description, 
      payload.priority
    );
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _getTicketByIdAction(ticketId: string) {
  try {
    const tenantId = await requireTenant();
    const session = await requireAuth();
    const result = await TicketService.getTicketById(tenantId, session.userId, ticketId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getTicketsAction = withServerActionContext(_getTicketsAction);

export const createTicketAction = withServerActionContext(_createTicketAction);

export const getTicketByIdAction = withServerActionContext(_getTicketByIdAction);
