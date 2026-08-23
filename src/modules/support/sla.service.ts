import prisma from '../../../database/utils/prisma';
import { withTenant, withTenantTransaction } from '../../../database/utils/prisma-tenant';
import { checkPermissionFast } from '../../lib/auth';

export class SLAService {
  /**
   * Check for SLA breaches. Typically run via a cron job.
   */
  static async processSLABreaches(tenantId: string) {
    const now = new Date();

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      
      const breachedTickets = await tx.ticket.findMany({
        where: {
          tenantId,
          status: { in: ['OPEN', 'PENDING'] },
          slaDeadline: { lt: now }
        },
        select: { id: true, slaDeadline: true }
      });

      const breaches = [];
      for (const ticket of breachedTickets) {
        try {
          const breach = await tx.sLAEvent.create({
            data: {
              tenantId,
              ticketId: ticket.id,
              type: 'RESOLUTION_BREACH',
              recordedAt: now
            }
          });
          breaches.push(breach);

          await tx.auditLog.create({
            data: {
              tenantId, actorId: 'SYSTEM', actorType: 'SYSTEM', action: 'SLA_BREACH',
              resource: 'TICKET', resourceId: ticket.id,
              metadata: { type: 'RESOLUTION_BREACH' }
            }
          });
        } catch (err: any) {
          if (err.code !== 'P2002') {
            throw err;
          }
        }
      }

      return breaches;
    });
  }

  /**
   * Updates SLA configuration.
   */
  static async updateSLAConfiguration(tenantId: string, userId: string, priority: any, responseMinutes: number, resolutionTimeMinutes: number) {
    const isAdmin = await checkPermissionFast(userId, 'SYSTEM', 'UPDATE');
    if (!isAdmin) {
      throw new Error('Forbidden: Only administrators can modify SLA policies');
    }

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      
      const config = await tx.sLAConfiguration.upsert({
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

      await tx.auditLog.create({
        data: {
          tenantId, actorId: userId, actorType: 'USER', action: 'SLA_CONFIG_UPDATE',
          resource: 'SYSTEM', resourceId: config.id,
          metadata: { priority, responseMinutes, resolutionTimeMinutes }
        }
      });

      return config;
    });
  }
}
