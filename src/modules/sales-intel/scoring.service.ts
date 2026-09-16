import prisma from '@db/utils/prisma';
import { withTenantTransaction } from '@db/utils/prisma-tenant';

export class ScoringService {
  /**
   * Securely update a Lead's AI score.
   * This MUST be called by an automation actor, not directly by a client endpoint.
   */
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
   * Securely update a Deal's probability factors.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  static async updateDealProbabilityFactors(tenantId: string, dealId: string, actorId: string, actorType: string, probabilityFactors: any, probability?: number) {
    if (actorType !== 'AI' && actorType !== 'AUTOMATION' && actorType !== 'SYSTEM') {
      throw new Error('Unauthorized actor type for AI scoring');
    }

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);

       
      const deal = await tx.deal.findUnique({ where: { id: dealId } });
      if (!deal || deal.tenantId !== tenantId) throw new Error('Deal not found');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
