import prisma from '@/../database/utils/prisma';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { Logger } from '@/lib/logger/logger';
import { AIProviderFactory } from '@/lib/providers/ai/ai-provider.factory';
import { requirePermissionFast } from '@/lib/auth';

export class ScoringService {
  /**
   * Calculates and updates the AI probability score for a Deal.
   * Requires the user to have DEAL_UPDATE permission since it mutates the Deal.
   */
  static async calculateDealProbability(tenantId: string, userId: string, dealId: string) {
    // 1. Authorization: User must have permission to update the deal
    await requirePermissionFast(userId, 'REVENUE', 'UPDATE');

    // 2. Fetch the Deal with context
    const tenantPrisma = withTenant(tenantId);
    const deal = await tenantPrisma.deal.findFirst({
      where: { id: dealId, tenantId },
      include: {
        customer: true,
        tasks: true,
        quotes: true,
        stage: true,
      }
    });

    if (!deal) {
      throw new Error(`Deal ${dealId} not found or unauthorized`);
    }

    // 3. Construct Context for AI
    const context = `
      Deal Title: ${deal.title}
      Value: ${deal.value} ${deal.currency}
      Status: ${deal.status}
      Stage: ${deal.stage.name}
      Customer: ${deal.customer?.name || 'Unknown'}
      Open Tasks: ${deal.tasks.filter(t => t.status !== 'COMPLETED').length}
      Total Quotes: ${deal.quotes.length}
    `;

    // 4. Initialize AI Provider
    const provider = await AIProviderFactory.getProvider('GEMINI');
    
    const prompt = `
      You are an expert enterprise CRM AI sales assistant. 
      Analyze the following deal and predict the probability of it closing successfully.
      Return a JSON object with exactly two keys:
      - "probability": an integer between 0 and 100.
      - "factors": an array of short strings explaining the key factors driving this probability.

      Deal Context:
      ${context}
    `;

    // 5. Execute AI Generation
    const response = await provider.generateResponse(
      prompt,
      [],
      'You output strictly valid JSON without markdown wrapping.'
    );

    let probability = 50;
    let probabilityFactors = ['Default scoring due to parse error'];

    try {
      const parsed = JSON.parse(response.text.trim());
      probability = typeof parsed.probability === 'number' ? parsed.probability : 50;
      probabilityFactors = Array.isArray(parsed.factors) ? parsed.factors : [];
    } catch (e) {
      Logger.warn('[ScoringService] Failed to parse AI JSON response', { response: response.text });
    }

    // 6. Update the Deal (using SYSTEM/AI context implicitly via backend service)
    await tenantPrisma.deal.update({
      where: { id: dealId },
      data: {
        probability,
        probabilityFactors: probabilityFactors as any
      }
    });

    // 7. Immutable Audit Log for AI Actor
    await tenantPrisma.auditLog.create({
      data: {
        tenantId,
        actorId: 'AI_SYSTEM',
        actorType: 'AI',
        action: 'UPDATE_SCORE',
        resource: 'DEAL',
        resourceId: dealId,
        metadata: {
          probability,
          factors: probabilityFactors,
          triggeredBy: userId
        }
      }
    });

    return { probability, probabilityFactors };
  }

  /**
   * Calculates and updates the AI score for a Lead.
   * Requires the user to have LEAD_UPDATE permission.
   */
  static async calculateLeadScore(tenantId: string, userId: string, leadId: string) {
    // 1. Authorization
    await requirePermissionFast(userId, 'LEAD', 'UPDATE');

    // 2. Fetch the Lead with context
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: { tasks: true }
    });

    if (!lead) {
      throw new Error(`Lead ${leadId} not found or unauthorized`);
    }

    // 3. Construct Context for AI
    const context = `
      Lead Name: ${lead.name}
      Company: ${lead.company}
      Status: ${lead.status}
      Tasks: ${lead.tasks.length}
    `;

    const provider = await AIProviderFactory.getProvider('GEMINI');
    
    const prompt = `
      You are an expert CRM AI. Analyze this lead and output JSON with:
      - "score": float between 0.0 and 100.0
      - "factors": array of strings.

      Lead Context:
      ${context}
    `;

    const response = await provider.generateResponse(
      prompt,
      [],
      'You output strictly valid JSON.'
    );

    let score = 50.0;
    let factors = ['Default scoring'];

    try {
      const parsed = JSON.parse(response.text.trim());
      score = typeof parsed.score === 'number' ? parsed.score : 50.0;
      factors = Array.isArray(parsed.factors) ? parsed.factors : [];
    } catch (e) {
      Logger.warn('[ScoringService] Failed to parse AI JSON response', { response: response.text });
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        score,
        scoreFactors: factors as any
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: 'AI_SYSTEM',
        actorType: 'AI',
        action: 'UPDATE_SCORE',
        resource: 'LEAD',
        resourceId: leadId,
        metadata: {
          score,
          factors,
          triggeredBy: userId
        }
      }
    });

    return { score, factors };
  }
}
