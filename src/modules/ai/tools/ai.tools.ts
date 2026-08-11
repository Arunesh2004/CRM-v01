import * as reportingService from '../../reporting/reporting.service';
import { getCurrentSubscription } from '../../billing/subscription/subscription.service';
import { getTenantUsage } from '../../billing/usage/usage.service';
import { getTasks } from '../../crm/task/task.service';
import { getLeads } from '../../crm/lead/lead.service';
import { getCustomers } from '../../crm/customer/customer.service';
import { getActivities } from '../../crm/activity/activity.service';
import { NotificationService } from '../../notifications/notification.service';
import { getEmployees } from '../../users/user.service';

import { requireAuth } from '@/lib/auth';
import { AITool } from '@/lib/providers/ai/ai-provider.interface';
import { resolveDateRange } from '@/lib/utils/date-resolver';

// Notice these tools NEVER accept a tenantId or userId from the model.
// They simply wrap existing services which intrinsically resolve context from requireTenant() and requireAuth().

export const secureTools: AITool[] = [
  {
    name: 'getMyTasks',
    description: 'Get the tasks assigned to the currently authenticated user.',
    requiredResource: 'TASK',
    requiredAction: 'READ',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'INTEGER', description: 'Maximum number of tasks to return. Default is 10, max is 50.' },
        status: { type: 'STRING', description: 'Filter by status, e.g., PENDING, IN_PROGRESS, COMPLETED' },
        timeframe: { type: 'STRING', description: 'A semantic timeframe for dueDate (e.g., "today", "yesterday", "tomorrow", "this_week", "last_week", "this_month", "last_month"). Do not generate ISO dates.' }
      }
    },
    execute: async (args: any) => {
      const user = await requireAuth();
      const limit = Math.min(args.limit || 10, 50);

      const bounds = resolveDateRange(args.timeframe);

      const response = await getTasks({
        limit,
        filters: { assignedUserId: user.id, ...(args.status && { status: args.status }) },
        ...(bounds?.startDate && { dueDateStart: bounds.startDate }),
        ...(bounds?.endDate && { dueDateEnd: bounds.endDate })
      });
      return {
        totalReturned: response.data.length,
        hasMore: response.pagination.hasMore,
        tasks: response.data.map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          customerName: t.customer?.name
        }))
      };
    }
  },
  {
    name: 'getMyLeads',
    description: 'Get the leads assigned to the currently authenticated user.',
    requiredResource: 'LEAD',
    requiredAction: 'READ',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'INTEGER', description: 'Maximum number to return. Max 50.' },
        status: { type: 'STRING', description: 'Filter by status, e.g., NEW, CONTACTED, QUALIFIED' },
        timeframe: { type: 'STRING', description: 'A semantic timeframe for lead creation date (e.g., "today", "yesterday", "this_week", "last_week", "this_month", "last_month"). Do not generate ISO dates.' }
      }
    },
    execute: async (args: any) => {
      const user = await requireAuth();
      const limit = Math.min(args.limit || 10, 50);

      const bounds = resolveDateRange(args.timeframe);

      const response = await getLeads({
        limit,
        filters: { assignedUserId: user.id, ...(args.status && { status: args.status }) },
        ...(bounds?.startDate && { createdAtStart: bounds.startDate }),
        ...(bounds?.endDate && { createdAtEnd: bounds.endDate })
      });
      return {
        totalReturned: response.data.length,
        hasMore: response.pagination.hasMore,
        leads: response.data.map((l: any) => ({
          id: l.id,
          name: l.name,
          company: l.company,
          status: l.status,
          email: l.email,
          phone: l.phone
        }))
      };
    }
  },
  {
    name: 'getMyCustomers',
    description: 'Get the customers assigned to the currently authenticated user.',
    requiredResource: 'CUSTOMER',
    requiredAction: 'READ',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'INTEGER', description: 'Max number to return. Max 50.' },
        status: { type: 'STRING', description: 'Filter by status, e.g., ACTIVE' },
        timeframe: { type: 'STRING', description: 'A semantic timeframe for customer creation date (e.g., "today", "yesterday", "this_week", "last_week", "this_month", "last_month"). Do not generate ISO dates.' }
      }
    },
    execute: async (args: any) => {
      const user = await requireAuth();
      const limit = Math.min(args.limit || 10, 50);

      const bounds = resolveDateRange(args.timeframe);

      const response = await getCustomers({
        limit,
        filters: { assignedUserId: user.id, ...(args.status && { status: args.status }) },
        ...(bounds?.startDate && { createdAtStart: bounds.startDate }),
        ...(bounds?.endDate && { createdAtEnd: bounds.endDate })
      });
      return {
        totalReturned: response.data.length,
        hasMore: response.pagination.hasMore,
        customers: response.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          industry: c.industry,
          status: c.status
        }))
      };
    }
  },
  {
    name: 'getMyActivity',
    description: 'Get the recent activity timeline for the currently authenticated user.',
    requiredResource: 'SYSTEM',
    requiredAction: 'READ',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'INTEGER', description: 'Max number to return. Max 50.' },
        timeframe: { type: 'STRING', description: 'A semantic timeframe for activity date (e.g., "today", "yesterday", "this_week", "last_week", "this_month", "last_month"). Do not generate ISO dates.' }
      }
    },
    execute: async (args: any) => {
      const user = await requireAuth();
      const limit = Math.min(args.limit || 10, 50);

      const bounds = resolveDateRange(args.timeframe);

      const activities = await getActivities({
        actorId: user.id,
        limit,
        ...(bounds?.startDate && { createdAtStart: bounds.startDate }),
        ...(bounds?.endDate && { createdAtEnd: bounds.endDate })
      });

      return {
        totalReturned: activities.length,
        activities: activities.map(a => ({
          type: a.type,
          content: a.content,
          entityType: a.entityType,
          createdAt: a.createdAt
        }))
      };
    }
  },
  {
    name: 'getMyNotifications',
    description: 'Get the recent notifications for the currently authenticated user.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'INTEGER', description: 'Max number to return. Max 50.' }
      }
    },
    execute: async (args: any) => {
      const user = await requireAuth();
      const limit = Math.min(args.limit || 10, 50);

      const notifications = await NotificationService.getNotifications({ userId: user.id, limit });
      return {
        totalReturned: notifications.length,
        notifications: notifications.map(n => ({
          type: n.type,
          title: n.title,
          body: n.body,
          createdAt: n.createdAt
        }))
      };
    }
  },
  {
    name: 'getEmployeeSummary',
    description: 'Lookup an employee (requires special permissions) and get a summary of their tasks, leads, and basic info.',
    requiredResource: 'USER',
    requiredAction: 'READ',
    parameters: {
      type: 'OBJECT',
      properties: {
        nameOrEmail: { type: 'STRING', description: 'The name or email of the employee to lookup.' }
      }
    },
    execute: async (args: any) => {
      if (!args.nameOrEmail) {
        return { error: 'You must provide a nameOrEmail to search for.' };
      }

      const employees = await getEmployees(args.nameOrEmail);

      if (employees.length === 0) {
        return { error: `No employees found matching "${args.nameOrEmail}".` };
      }

      if (employees.length > 1) {
        return {
          error: `Ambiguity Error: I found ${employees.length} employees matching "${args.nameOrEmail}". Please specify which one you mean.`,
          matches: employees.map(e => e.email)
        };
      }

      const employee = employees[0];

      let taskSummary: any = { error: 'Not authorized to view tasks' };
      try {
        const tasks = await getTasks({ limit: 100, filters: { assignedUserId: employee.id } });
        const pending = tasks.data.filter((t: any) => t.status === 'PENDING').length;
        const inProgress = tasks.data.filter((t: any) => t.status === 'IN_PROGRESS').length;
        const completed = tasks.data.filter((t: any) => t.status === 'COMPLETED').length;
        taskSummary = { total: tasks.data.length, pending, inProgress, completed };
      } catch (e) {}

      let leadSummary: any = { error: 'Not authorized to view leads' };
      try {
        const leads = await getLeads({ limit: 100, filters: { assignedUserId: employee.id } });
        leadSummary = { total: leads.data.length };
      } catch (e) {}

      return {
        employee: {
          id: employee.id,
          email: employee.email,
          status: employee.status,
          roles: employee.userRoles.map((ur: any) => ur.role.name)
        },
        taskSummary,
        leadSummary
      };
    }
  },
  {
    name: 'getIncidentSummary',
    description: 'Get a summary of security incidents including total, open, critical, and resolved counts.',
    requiredResource: 'INCIDENT',
    requiredAction: 'READ',
    parameters: { type: 'OBJECT', properties: {} },
    execute: async () => {
      return await reportingService.getSecurityMetrics();
    }
  },
  {
    name: 'getCustomerSummary',
    description: 'Get a summary of CRM data including leads, customers, and conversion rates.',
    requiredResource: 'CUSTOMER',
    requiredAction: 'READ',
    parameters: { type: 'OBJECT', properties: {} },
    execute: async () => {
      return await reportingService.getCrmMetrics();
    }
  },
  {
    name: 'getCameraStatus',
    description: 'Get the total number of cameras, active streams, and offline cameras.',
    requiredResource: 'CAMERA',
    requiredAction: 'READ',
    parameters: { type: 'OBJECT', properties: {} },
    execute: async () => {
      return await reportingService.getCameraMetrics();
    }
  },
  {
    name: 'getCommunicationSummary',
    description: 'Get statistics about dispatched notifications (email, sms, whatsapp) and success rates.',
    requiredResource: 'COMMUNICATION',
    requiredAction: 'READ',
    parameters: { type: 'OBJECT', properties: {} },
    execute: async () => {
      return await reportingService.getCommunicationMetrics();
    }
  },
  {
    name: 'getBillingSummary',
    description: 'Get current subscription plan and usage percentage.',
    requiredResource: 'BILLING',
    requiredAction: 'READ',
    parameters: { type: 'OBJECT', properties: {} },
    execute: async () => {
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
