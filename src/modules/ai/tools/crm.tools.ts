import { AITool } from '@/lib/providers/ai/ai-provider.interface';
import { AIPermissionService } from '@/modules/ai-permissions/ai-permission.service';
import { globalSearch } from '@/modules/search/search.service';
import { getCustomerById } from '@/modules/crm/customer/customer.service';
import { updateLead } from '@/modules/crm/lead/lead.service';
import { FieldSecurityService } from '@/modules/security/field-security/field-security.service';
import { AIContext } from '../context/context-builder.service';

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
    execute: async (args: any, context?: AIContext) => {
      if (!context || !context.tenantId || !context.user?.id) {
         throw new Error("Unauthorized: Missing secure AI context");
      }
      
      await AIPermissionService.requestToolExecution({
        toolName: 'search_crm',
        input: args
      }, { user: { id: context.user.id }, tenantId: context.tenantId });

      // Note: globalSearch internally checks permissions for each domain
      const results = await globalSearch(context.tenantId, args.query, context.user.id);
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
    execute: async (args: any, context?: AIContext) => {
      if (!context || !context.tenantId || !context.user?.id) {
        throw new Error("Unauthorized: Missing secure AI context");
      }

      await AIPermissionService.requestToolExecution({
        toolName: 'get_customer',
        input: args
      }, { user: { id: context.user.id }, tenantId: context.tenantId });

      // Assuming async context is preserved from the original API route call.
      const customer = await getCustomerById(args.customerId);
      if (!customer) throw new Error('Customer not found or unauthorized');

      const masked = await FieldSecurityService.maskFields(context.tenantId, context.user.id, 'CUSTOMER', customer);
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
    execute: async (args: any, context?: AIContext) => {
      if (!context || !context.tenantId || !context.user?.id) {
        throw new Error("Unauthorized: Missing secure AI context");
      }

      await AIPermissionService.requestToolExecution({
        toolName: 'update_lead',
        input: args
      }, { user: { id: context.user.id }, tenantId: context.tenantId });

      // Assuming async context is preserved from the original API route call.
      const updated = await updateLead({
        id: args.leadId,
        status: args.status as any,
      });

      return updated;
    }
  }
];
