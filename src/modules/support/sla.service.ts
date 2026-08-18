import prisma from '../../../database/utils/prisma';
import { checkPermissionFast } from '../../lib/auth';

export class SLAService {
  /**
   * Check for SLA breaches. Typically run via a cron job.
   */
  static async processSLABreaches(tenantId: string) {
    // To prevent O(N) scans, we only look at OPEN/PENDING tickets with an slaDeadline in the past.
    // Ensure we don't process if slaDeadline is null.
    
    // Set tenant context if using RLS, though we can explicitly filter by tenantId.
    const now = new Date();

    // Use explicit locking or transactions if required, but for SLA events, idempotent upserts are better.
    const breachedTickets = await prisma.ticket.findMany({
      where: {
        tenantId,
        status: { in: ['OPEN', 'PENDING'] },
        slaDeadline: { lt: now }
      },
      select: { id: true, slaDeadline: true }
    });

    const breaches = [];
    for (const ticket of breachedTickets) {
      // Create SLAEvent idempotently (handled via unique constraint tenantId, ticketId, type)
      try {
        const breach = await prisma.sLAEvent.create({
          data: {
            tenantId,
            ticketId: ticket.id,
            type: 'RESOLUTION_BREACH',
            recordedAt: now
          }
        });
        breaches.push(breach);

        await prisma.auditLog.create({
          data: {
            tenantId, actorId: 'SYSTEM', actorType: 'SYSTEM', action: 'SLA_BREACH',
            resource: 'TICKET', resourceId: ticket.id,
            metadata: { type: 'RESOLUTION_BREACH' }
          }
        });
      } catch (err: any) {
        // If it's a unique constraint violation (P2002), it means the breach was already recorded. Safe to ignore.
        if (err.code !== 'P2002') {
          throw err;
        }
      }
    }

    return breaches;
  }

  /**
   * Updates SLA configuration.
   */
  static async updateSLAConfiguration(tenantId: string, userId: string, priority: any, responseMinutes: number, resolutionTimeMinutes: number) {
    // Only TENANT_ADMIN or equivalent should be able to update SLAs.
    // For this, we assume MANAGE_TERRITORIES or a specific SYSTEM config permission.
    // In CRM context, updating configurations requires broad access. We'll check for 'SYSTEM' 'UPDATE'.
    const isAdmin = await checkPermissionFast(userId, 'SYSTEM', 'UPDATE');
    if (!isAdmin) {
      throw new Error('Forbidden: Only administrators can modify SLA policies');
    }

    const config = await prisma.sLAConfiguration.upsert({
      where: {
        tenantId_priority: {
          tenantId,
          priority
        }
      },
      update: {
        responseMinutes,
        resolutionTimeMinutes
      },
      create: {
        tenantId,
        priority,
        responseMinutes,
        resolutionTimeMinutes
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId, actorId: userId, actorType: 'USER', action: 'UPDATE_SLA_CONFIG',
        resource: 'SYSTEM', resourceId: config.id,
        metadata: { priority, responseMinutes, resolutionTimeMinutes }
      }
    });

    return config;
  }
}
