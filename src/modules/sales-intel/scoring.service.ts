import prisma from '@/../database/utils/prisma';
import { withTenant, withTenantTransaction } from '@/../database/utils/prisma-tenant';

export class ScoringService {
  /**
   * Securely update a Lead's AI score.
   * This MUST be called by an automation actor, not directly by a client endpoint.
   */
  static async updateLeadScore(tenantId: string, leadId: string, actorId: string, actorType: string, score: number, scoreFactors: any) {
    if (actorType !== 'AI' && actorType !== 'AUTOMATION' && actorType !== 'SYSTEM') {
      throw new Error('Unauthorized actor type for AI scoring');
    }

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);

      const lead = await tx.lead.findUnique({ where: { id: leadId } });
      if (!lead || lead.tenantId !== tenantId) throw new Error('Lead not found');

      const updated = await tx.lead.update({
        where: { id: leadId },
        data: { score, scoreFactors },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          actorType: actorType as any,
          action: 'LEAD_SCORE_UPDATED',
          resource: 'Lead',
          resourceId: leadId,
        },
      });

      return updated;
    });
  }

  /**
   * Securely update a Deal's probability factors.
   */
  static async updateDealProbabilityFactors(tenantId: string, dealId: string, actorId: string, actorType: string, probabilityFactors: any, probability?: number) {
    if (actorType !== 'AI' && actorType !== 'AUTOMATION' && actorType !== 'SYSTEM') {
      throw new Error('Unauthorized actor type for AI scoring');
    }

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);

      const deal = await tx.deal.findUnique({ where: { id: dealId } });
      if (!deal || deal.tenantId !== tenantId) throw new Error('Deal not found');

      const updateData: any = { probabilityFactors };
      if (probability !== undefined) {
        updateData.probability = probability;
      }

      const updated = await tx.deal.update({
        where: { id: dealId },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          actorType: actorType as any,
          action: 'DEAL_PROBABILITY_UPDATED',
          resource: 'Deal',
          resourceId: dealId,
        },
      });

      return updated;
    });
  }
}
