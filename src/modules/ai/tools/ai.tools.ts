import * as reportingService from '../../reporting/reporting.service';
import { getCurrentSubscription } from '../../billing/subscription/subscription.service';
import { getTenantUsage } from '../../billing/usage/usage.service';
import { AITool } from '@/lib/providers/ai/ai-provider.interface';

// Notice these tools NEVER accept a tenantId. 
// They simply wrap existing services which intrinsically resolve context from requireTenant().

export const secureTools: AITool[] = [
  {
    name: 'getIncidentSummary',
    description: 'Get a summary of security incidents including total, open, critical, and resolved counts.',
    execute: async () => {
      // reportingService will internally call requireTenant()
      return await reportingService.getSecurityMetrics();
    }
  },
  {
    name: 'getCustomerSummary',
    description: 'Get a summary of CRM data including leads, customers, and conversion rates.',
    execute: async () => {
      return await reportingService.getCrmMetrics();
    }
  },
  {
    name: 'getCameraStatus',
    description: 'Get the total number of cameras, active streams, and offline cameras.',
    execute: async () => {
      return await reportingService.getCameraMetrics();
    }
  },
  {
    name: 'getCommunicationSummary',
    description: 'Get statistics about dispatched notifications (email, sms, whatsapp) and success rates.',
    execute: async () => {
      return await reportingService.getCommunicationMetrics();
    }
  },
  {
    name: 'getBillingSummary',
    description: 'Get current subscription plan and usage percentage.',
    execute: async () => {
      // Wrap two existing services
      const sub = await getCurrentSubscription();
      const usage = await getTenantUsage();
      
      let usagePercentage = 0;
      if (usage && usage.cameras.limit > 0) {
        usagePercentage = (usage.cameras.used / usage.cameras.limit) * 100;
      }
      
      return {
        planName: sub?.plan?.name || 'Unknown',
        status: sub?.status || 'Unknown',
        usagePercentage: usagePercentage.toFixed(1)
      };
    }
  }
];
