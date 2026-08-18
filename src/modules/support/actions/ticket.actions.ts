'use server'

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { TicketService } from '../ticket.service';

export async function getTicketsAction() {
  try {
    const tenantId = await requireTenant();
    const session = await requireAuth();
    const result = await TicketService.getTickets(tenantId, session.userId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function createTicketAction(payload: any) {
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

export async function getTicketByIdAction(ticketId: string) {
  try {
    const tenantId = await requireTenant();
    const session = await requireAuth();
    const result = await TicketService.getTicketById(tenantId, session.userId, ticketId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
