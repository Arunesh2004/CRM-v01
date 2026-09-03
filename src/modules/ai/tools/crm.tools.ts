import { AITool } from '@/lib/providers/ai/ai-provider.interface';
import { AIPermissionService } from '@/modules/ai-permissions/ai-permission.service';
import { globalSearch } from '@/modules/search/search.service';
import { getCustomerById } from '@/modules/crm/customer/customer.service';
import { updateLead } from '@/modules/crm/lead/lead.service';
import { FieldSecurityService } from '@/modules/security/field-security/field-security.service';

export const crmTools: AITool[] = [
  {
    name: 'search_crm',
    description: 'Searches across CRM for customers, leads, tasks, and communications.',
    requiredResource: 'CUSTOMER',
    requiredAction: 'READ',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query']
    },
    execute: async (args: any, context?: any) => {
      if (!context || !context.tenantId || !context.userId) {
         throw new Error("Missing context");
      }
      // Log the execution request
      await AIPermissionService.requestToolExecution({
        toolName: 'search_crm',
        input: args
      }, { user: { id: context.userId }, tenantId: context.tenantId });

      // Note: globalSearch internally checks permissions for each domain
      const results = await globalSearch(context.tenantId, args.query, context.userId);
      return results;
    }
  },
  {
    name: 'get_customer',
    description: 'Retrieves details about a specific customer by ID.',
    requiredResource: 'CUSTOMER',
    requiredAction: 'READ',
    parameters: {
      type: 'object',
      properties: { customerId: { type: 'string' } },
      required: ['customerId']
    },
    execute: async (args: any, context?: any) => {
      if (!context || !context.tenantId || !context.userId) throw new Error("Missing context");

      await AIPermissionService.requestToolExecution({
        toolName: 'get_customer',
        input: args
      }, { user: { id: context.userId }, tenantId: context.tenantId });

      // Inject mock Auth for the service execution (it uses requireAuth internally)
      // Since AI is executing, we simulate the auth context safely.
      // Wait, customer.service.ts uses requireAuth(). This throws if not in a request context!
      // In CopilotService, this runs inside the API Route, so requireAuth() MIGHT work if Next.js AsyncLocalStorage retains it.
      // However, it's safer if we just call the service. Let's see if it works.
      const customer = await getCustomerById(args.customerId);
      if (!customer) throw new Error('Customer not found or unauthorized');

      const masked = await FieldSecurityService.maskFields(context.tenantId, context.userId, 'CUSTOMER', customer);
      return masked;
    }
  },
  {
    name: 'update_lead',
    description: 'Updates a lead status.',
    requiredResource: 'LEAD',
    requiredAction: 'UPDATE',
    parameters: {
      type: 'object',
      properties: { 
        leadId: { type: 'string' },
        status: { type: 'string', enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'LOST', 'CONVERTED'] }
      },
      required: ['leadId', 'status']
    },
    execute: async (args: any, context?: any) => {
      if (!context || !context.tenantId || !context.userId) throw new Error("Missing context");

      await AIPermissionService.requestToolExecution({
        toolName: 'update_lead',
        input: args
      }, { user: { id: context.userId }, tenantId: context.tenantId });

      // Assuming async context is preserved from the original API route call.
      const updated = await updateLead({
        id: args.leadId,
        status: args.status as any,
      });

      return updated;
    }
  }
];
