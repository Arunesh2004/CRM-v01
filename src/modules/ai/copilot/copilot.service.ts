import prisma from '@db/utils/prisma';
import { Logger } from '@/lib/logger/logger';
import { AIProviderFactory } from '@/lib/providers/ai/ai-provider.factory';
import { AIPermissionService } from '@/modules/ai-permissions/ai-permission.service';
import { FieldSecurityService } from '@/modules/security/field-security/field-security.service';

let toolsBootstrapped = false;

export class CopilotService {
  /**
   * Secure Copilot Chat execution supporting summarization and safe drafting.
   */
  static async handleChat(tenantId: string, userId: string, message: string, history: any[] = []) {
    if (!toolsBootstrapped) {
      await this.bootstrapTools();
      toolsBootstrapped = true;
    }

    // Get the provider
    const provider = await AIProviderFactory.getProvider('GEMINI');
    
    // Construct system prompt preventing prompt-injection overrides
    const systemPrompt = `
      You are an internal Enterprise AI Sales Assistant. 
      You operate under strict tenant isolation. 
      You cannot change ownership, send emails autonomously, approve quotes, or mutate deals directly unless via approved tools.
      For summarizing deals or customers, use the provided tools.
      Any email you draft must be presented to the user as DRAFT text. DO NOT send emails.
    `;

    const toolResponses: any[] = [];

    const tools = [
      {
        name: 'summarize_deal',
        description: 'Summarizes a CRM Deal by ID',
        parameters: {
          type: 'object',
          properties: { dealId: { type: 'string' } },
          required: ['dealId']
        },
        execute: async (args: any) => {
             try {
               await AIPermissionService.requestToolExecution({
                 toolName: 'summarize_deal',
                 input: args
               }, { user: { id: userId }, tenantId });

               const deal = await prisma.deal.findFirst({
                 where: { id: args.dealId, tenantId },
                 include: { tasks: true, quotes: true }
               });
               if (!deal) throw new Error('Deal not found or unauthorized');
               const masked = await FieldSecurityService.maskFields(tenantId, userId, 'DEAL', deal);
               toolResponses.push({ name: 'summarize_deal', result: masked });
               return masked;
             } catch (error: any) {
               const errorObj = { name: 'summarize_deal', error: error.message };
               toolResponses.push(errorObj);
               return errorObj;
             }
        }
      },
      {
        name: 'summarize_customer',
        description: 'Summarizes a CRM Customer by ID',
        parameters: {
          type: 'object',
          properties: { customerId: { type: 'string' } },
          required: ['customerId']
        },
        execute: async (args: any) => {
             try {
               await AIPermissionService.requestToolExecution({
                 toolName: 'summarize_customer',
                 input: args
               }, { user: { id: userId }, tenantId });

               const customer = await prisma.customer.findFirst({
                 where: { id: args.customerId, tenantId }
               });
               if (!customer) throw new Error('Customer not found or unauthorized');
               const masked = await FieldSecurityService.maskFields(tenantId, userId, 'CUSTOMER', customer);
               toolResponses.push({ name: 'summarize_customer', result: masked });
               return masked;
             } catch (error: any) {
               const errorObj = { name: 'summarize_customer', error: error.message };
               toolResponses.push(errorObj);
               return errorObj;
             }
        }
      },
      {
        name: 'draft_email',
        description: 'Drafts a follow-up email based on context',
        parameters: {
          type: 'object',
          properties: { contextText: { type: 'string' } },
          required: ['contextText']
        },
        execute: async (args: any) => {
             try {
               await AIPermissionService.requestToolExecution({
                 toolName: 'draft_email',
                 input: args
               }, { user: { id: userId }, tenantId });

               const result = `[DRAFT EMAIL]: Based on ${args.contextText}`;
               toolResponses.push({ name: 'draft_email', result });
               return result;
             } catch (error: any) {
               const errorObj = { name: 'draft_email', error: error.message };
               toolResponses.push(errorObj);
               return errorObj;
             }
        }
      }
    ];

    const response = await provider.generateResponse(
      message,
      tools,
      systemPrompt,
      undefined,
      history
    );

    return { text: response.text, toolResponses };
  }

  private static async bootstrapTools() {
    const toolsToEnsure = [
      { name: 'summarize_deal', requiredPermission: 'DEAL:READ', riskLevel: 'LOW' },
      { name: 'summarize_customer', requiredPermission: 'CUSTOMER:READ', riskLevel: 'LOW' },
      { name: 'draft_email', requiredPermission: 'COMMUNICATION:CREATE', riskLevel: 'MODERATE' }
    ];

    for (const t of toolsToEnsure) {
      await prisma.aITool.upsert({
        where: { name: t.name },
        update: {},
        create: {
          name: t.name,
          requiredPermission: t.requiredPermission,
          riskLevel: t.riskLevel as any,
          requiresApproval: false
        }
      });
    }
  }
}
