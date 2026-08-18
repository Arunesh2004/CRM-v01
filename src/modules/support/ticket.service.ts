import prisma from '../../../database/utils/prisma';
import { checkPermissionFast } from '../../lib/auth';
import { Action, ActorType, Resource, TicketStatus } from '@prisma/client';
import { SecurityEventService } from '../security-events/security-event.service';
import { FieldSecurityService } from '../security/field-security/field-security.service';

export class TicketService {
  static async getTickets(tenantId: string, userId: string) {
    await checkPermissionFast(userId, 'TICKET', 'READ');
    const tickets = await prisma.ticket.findMany({
      where: { tenantId },
      include: {
        customer: true,
        assignedUser: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return Promise.all(tickets.map(t => FieldSecurityService.maskFields(tenantId, userId, 'Ticket', t)));
  }

  static async getTicketById(tenantId: string, userId: string, ticketId: string) {
    await checkPermissionFast(userId, 'TICKET', 'READ');
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, tenantId },
      include: {
        customer: true,
        assignedUser: true,
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    if (!ticket) return null;
    return FieldSecurityService.maskFields(tenantId, userId, 'Ticket', ticket);
  }

  /**
   * Creates a new support ticket.
   */
  static async createTicket(tenantId: string, userId: string, customerId: string, subject: string, description: string, priority: any) {
    // Validate CREATE access for tickets
    const canCreate = await checkPermissionFast(userId, 'TICKET', 'CREATE');
    if (!canCreate) {
      await SecurityEventService.logEvent(tenantId, {
        eventType: 'AI_PERMISSION_FAILURE',
        severity: 'HIGH',
        userId: userId,
        source: 'TICKET_SERVICE',
        metadata: { reason: 'Unauthorized ticket creation attempt', resource: 'TICKET' }
      }, 'USER', userId);
      throw new Error('Forbidden: Insufficient privileges to create ticket');
    }

    const ticket = await prisma.ticket.create({
      data: {
        tenantId,
        customerId,
        subject,
        description,
        priority,
        status: 'OPEN'
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId, actorId: userId, actorType: 'USER', action: 'CREATE',
        resource: 'TICKET', resourceId: ticket.id,
        metadata: { subject, priority }
      }
    });

    return ticket;
  }

  /**
   * Add a message to an existing ticket.
   */
  static async addMessage(tenantId: string, ticketId: string, senderId: string, senderType: ActorType, content: string, isInternal: boolean = false) {
    // Determine required action based on sender type
    if (senderType === 'USER' || senderType === 'AI') {
      const canUpdate = await checkPermissionFast(senderId, 'TICKET', 'UPDATE');
      if (!canUpdate) {
        await SecurityEventService.logEvent(tenantId, {
          eventType: 'AI_PERMISSION_FAILURE',
          severity: 'HIGH',
          userId: senderId,
          source: 'TICKET_SERVICE',
          metadata: { reason: 'Unauthorized ticket message attempt', resource: 'TICKET', ticketId }
        }, senderType, senderId);
        throw new Error('Forbidden: Insufficient privileges to reply to ticket');
      }
    }

    // Verify ticket exists in this tenant (Cross-tenant check is handled automatically if RLS is on, but explicitly checked here for safety).
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, tenantId }
    });
    
    if (!ticket) {
        throw new Error('Ticket not found or cross-tenant access denied');
    }

    const message = await prisma.ticketMessage.create({
      data: {
        tenantId,
        ticketId,
        senderId,
        senderType,
        content,
        isInternal
      }
    });

    // Automatically change status from RESOLVED/CLOSED to OPEN if a customer replies
    if (senderType !== 'USER' && senderType !== 'AI' && (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED')) {
        await prisma.ticket.update({
            where: { id: ticket.id },
            data: { status: 'OPEN' }
        });
    }

    await prisma.auditLog.create({
      data: {
        tenantId, actorId: senderId, actorType: senderType, action: 'CREATE_MESSAGE',
        resource: 'TICKET', resourceId: ticketId,
        metadata: { isInternal }
      }
    });

    return message;
  }

  /**
   * Assigns a ticket to a specific support agent.
   */
  static async assignTicket(tenantId: string, ticketId: string, assignerId: string, assignedUserId: string) {
    const canUpdate = await checkPermissionFast(assignerId, 'TICKET', 'UPDATE');
    if (!canUpdate) {
      throw new Error('Forbidden: Insufficient privileges to assign ticket');
    }

    const ticket = await prisma.ticket.update({
      where: { id: ticketId, tenantId },
      data: { assignedUserId }
    });

    await prisma.auditLog.create({
      data: {
        tenantId, actorId: assignerId, actorType: 'USER', action: 'ASSIGN',
        resource: 'TICKET', resourceId: ticketId,
        metadata: { assignedUserId }
      }
    });

    return ticket;
  }

  /**
   * Updates the status of a ticket.
   */
  static async updateStatus(tenantId: string, ticketId: string, userId: string, status: TicketStatus) {
    const canUpdate = await checkPermissionFast(userId, 'TICKET', 'UPDATE');
    if (!canUpdate) {
      throw new Error('Forbidden: Insufficient privileges to change ticket status');
    }

    const data: any = { status };
    if (status === 'RESOLVED') data.resolvedAt = new Date();
    if (status === 'CLOSED') data.closedAt = new Date();

    const ticket = await prisma.ticket.update({
      where: { id: ticketId, tenantId },
      data
    });

    await prisma.auditLog.create({
      data: {
        tenantId, actorId: userId, actorType: 'USER', action: 'UPDATE_STATUS',
        resource: 'TICKET', resourceId: ticketId,
        metadata: { status }
      }
    });

    return ticket;
  }
}
