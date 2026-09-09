import { Prisma } from '@prisma/client';
import prisma from '../../../database/utils/prisma';
import { withTenantTransaction } from '../../../database/utils/prisma-tenant';
import { checkPermissionFast } from '../../lib/auth';
import { ActorType, TicketStatus } from '@prisma/client';
import { SecurityEventService } from '../security-events/security-event.service';
import { FieldSecurityService } from '../security/field-security/field-security.service';
import { withIdempotency, IdempotencyOperations } from '@/lib/idempotency';

export class TicketService {
  static async getTickets(tenantId: string, userId: string) {
    await checkPermissionFast(userId, 'TICKET', 'READ');
    
    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      const tickets = await tx.ticket.findMany({
        where: { tenantId },
        include: {
          customer: true,
          assignedUser: true
        },
        orderBy: { createdAt: 'desc' }
      });
      return Promise.all(tickets.map(t => FieldSecurityService.maskFields(tenantId, userId, 'Ticket', t)));
    });
  }

  static async getTicketById(tenantId: string, userId: string, ticketId: string) {
    await checkPermissionFast(userId, 'TICKET', 'READ');

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      const ticket = await tx.ticket.findFirst({
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
    });
  }

  /**
   * Creates a new support ticket.
   */
   
   
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  static async createTicket(tenantId: string, userId: string, customerId: string, subject: string, description: string, priority: any, externalTx?: Prisma.TransactionClient, idempotencyKey?: string) {
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

     
    const runTx = async (baseTx: Prisma.TransactionClient) => {
      const tx = await withTenantTransaction(baseTx, tenantId);

      
      // Enforce parent ownership (BOLA prevention)
      const customer = await tx.customer.findFirst({
        where: { id: customerId, tenantId } // RLS guarantees isolation for HTTP, but background needs explicit tenantId
      });
      if (!customer) {
        throw new Error('Customer not found or cross-tenant access denied');
      }
      
      const ticket = await tx.ticket.create({
        data: {
          tenantId,
          customerId,
          subject,
          description,
          priority,
          status: 'OPEN'
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId, actorId: userId, actorType: 'USER', action: 'CREATE',
          resource: 'TICKET', resourceId: ticket.id,
          metadata: { subject, priority }
        }
      });

      return ticket;
    };

    if (idempotencyKey && !externalTx) {
      return await withIdempotency(
        tenantId,
        userId,
        IdempotencyOperations.CREATE_TICKET,
        idempotencyKey,
        { customerId, subject, description, priority },
         
        runTx,
        async (tId, uId, rId) => {
          const res = await TicketService.getTicketById(tId, uId, rId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
          return res as any;
        }
      );
    }

    if (externalTx) return runTx(externalTx);
    return prisma.$transaction(runTx);
  }


  /**
   * Add a message to an existing ticket.
   */
  static async addMessage(tenantId: string, ticketId: string, senderId: string, senderType: ActorType, content: string, isInternal: boolean = false) {
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

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);

      const ticket = await tx.ticket.findFirst({
        where: { id: ticketId, tenantId }
      });
      
      if (!ticket) {
          throw new Error('Ticket not found or cross-tenant access denied');
      }

      const message = await tx.ticketMessage.create({
        data: {
          tenantId,
          ticketId,
          senderId,
          senderType,
          content,
          isInternal
        }
      });

      if (senderType !== 'USER' && senderType !== 'AI' && (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED')) {
          await tx.ticket.update({
              where: { id: ticket.id },
              data: { status: 'OPEN' }
          });
      }

      await tx.auditLog.create({
        data: {
          tenantId, actorId: senderId, actorType: senderType, action: 'CREATE_MESSAGE',
          resource: 'TICKET', resourceId: ticketId,
          metadata: { isInternal }
        }
      });

      return message;
    });
  }

  /**
   * Assigns a ticket to a specific support agent.
   */
  static async assignTicket(tenantId: string, ticketId: string, assignerId: string, assignedUserId: string) {
    const canUpdate = await checkPermissionFast(assignerId, 'TICKET', 'UPDATE');
    if (!canUpdate) {
      throw new Error('Forbidden: Insufficient privileges to assign ticket');
    }

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      const ticket = await tx.ticket.update({
        where: { id: ticketId, tenantId },
        data: { assignedUserId }
      });

      await tx.auditLog.create({
        data: {
          tenantId, actorId: assignerId, actorType: 'USER', action: 'ASSIGN',
          resource: 'TICKET', resourceId: ticketId,
          metadata: { assignedUserId }
        }
      });

      return ticket;
    });
  }

  /**
   * Updates the status of a ticket.
   */
  static async updateStatus(tenantId: string, ticketId: string, userId: string, status: TicketStatus) {
    const canUpdate = await checkPermissionFast(userId, 'TICKET', 'UPDATE');
     
    if (!canUpdate) {
      throw new Error('Forbidden: Insufficient privileges to change ticket status');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    const data: any = { status };
    if (status === 'RESOLVED') data.resolvedAt = new Date();
    if (status === 'CLOSED') data.closedAt = new Date();

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      const ticket = await tx.ticket.update({
        where: { id: ticketId, tenantId },
        data
      });

      await tx.auditLog.create({
        data: {
          tenantId, actorId: userId, actorType: 'USER', action: 'UPDATE_STATUS',
          resource: 'TICKET', resourceId: ticketId,
          metadata: { status }
        }
      });

      return ticket;
    });
  }
}
