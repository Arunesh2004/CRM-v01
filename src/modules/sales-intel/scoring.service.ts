import prisma from '@/../database/utils/prisma';

export class ScoringService {
  /**
   * Securely update a Lead's AI score.
   * This MUST be called by an automation actor, not directly by a client endpoint.
   */
  static async updateLeadScore(tenantId: string, leadId: string, actorId: string, actorType: string, score: number, scoreFactors: any) {
    if (actorType !== 'AI' && actorType !== 'AUTOMATION' && actorType !== 'SYSTEM') {
      // Reject direct client manipulation
      throw new Error('Unauthorized actor type for AI scoring');
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.tenantId !== tenantId) throw new Error('Lead not found');

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: { score, scoreFactors },
    });

    await prisma.auditLog.create({
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
  }

  /**
   * Securely update a Deal's probability factors.
   */
  static async updateDealProbabilityFactors(tenantId: string, dealId: string, actorId: string, actorType: string, probabilityFactors: any, probability?: number) {
    if (actorType !== 'AI' && actorType !== 'AUTOMATION' && actorType !== 'SYSTEM') {
      throw new Error('Unauthorized actor type for AI scoring');
    }

    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || deal.tenantId !== tenantId) throw new Error('Deal not found');

    const updateData: any = { probabilityFactors };
    if (probability !== undefined) {
      updateData.probability = probability;
    }

    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: updateData,
    });

    await prisma.auditLog.create({
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
  }
}
