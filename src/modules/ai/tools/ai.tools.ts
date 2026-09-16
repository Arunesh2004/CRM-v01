import { CANONICAL_AI_TOOLS } from './config';

const getCanonical = (name: string) => {
  const tool = CANONICAL_AI_TOOLS.find(t => t.name === name);
  if (!tool) throw new Error(`Canonical tool definition missing for ${name}`);
  return {
    name: tool.name,
    description: tool.description,
    requiredResource: tool.requiredResource,
    requiredAction: tool.requiredAction,
    confirmation_required: tool.requiresApproval
  };
};

import * as reportingService from '../../reporting/reporting.service';

import { getTasks } from '../../crm/task/task.service';
import { getLeads, getLeadById } from '../../crm/lead/lead.service';
import { getCustomers, getCustomerById } from '../../crm/customer/customer.service';
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
    ...getCanonical('getMyTasks'),
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'INTEGER', description: 'Maximum number of tasks to return. Default is 10, max is 50.' },
        status: { type: 'STRING', description: 'Filter by status, e.g., PENDING, IN_PROGRESS, COMPLETED' },
        timeframe: { type: 'STRING', description: 'A semantic timeframe for dueDate (e.g., "today", "yesterday", "tomorrow", "this_week", "last_week", "this_month", "last_month"). Do not generate ISO dates.' }
      }
    },
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
    ...getCanonical('getMyLeads'),
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'INTEGER', description: 'Maximum number to return. Max 50.' },
        status: { type: 'STRING', description: 'Filter by status, e.g., NEW, CONTACTED, QUALIFIED' },
        timeframe: { type: 'STRING', description: 'A semantic timeframe for lead creation date (e.g., "today", "yesterday", "this_week", "last_week", "this_month", "last_month"). Do not generate ISO dates.' }
       
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
    ...getCanonical('getMyCustomers'),
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'INTEGER', description: 'Max number to return. Max 50.' },
         
        status: { type: 'STRING', description: 'Filter by status, e.g., ACTIVE' },
        timeframe: { type: 'STRING', description: 'A semantic timeframe for customer creation date (e.g., "today", "yesterday", "this_week", "last_week", "this_month", "last_month"). Do not generate ISO dates.' }
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
    ...getCanonical('getMyActivity'),
    parameters: {
       
      type: 'OBJECT',
      properties: {
        limit: { type: 'INTEGER', description: 'Max number to return. Max 50.' },
        timeframe: { type: 'STRING', description: 'A semantic timeframe for activity date (e.g., "today", "yesterday", "this_week", "last_week", "this_month", "last_month"). Do not generate ISO dates.' }
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
     
    ...getCanonical('getMyNotifications'),
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'INTEGER', description: 'Max number to return. Max 50.' }
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
    ...getCanonical('getEmployeeSummary'),
    parameters: {
      type: 'OBJECT',
      properties: {
        nameOrEmail: { type: 'STRING', description: 'The name or email of the employee to lookup.' }
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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

       
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
      let taskSummary: any = { error: 'Not authorized to view tasks' };
      try {
        const tasks = await getTasks({ limit: 100, filters: { assignedUserId: employee.id } });
         
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
        const pending = tasks.data.filter((t: any) => t.status === 'PENDING').length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
        const inProgress = tasks.data.filter((t: any) => t.status === 'IN_PROGRESS').length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
        const completed = tasks.data.filter((t: any) => t.status === 'COMPLETED').length;
        taskSummary = { total: tasks.data.length, pending, inProgress, completed };
       
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
      } catch (e) {}

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
      let leadSummary: any = { error: 'Not authorized to view leads' };
      try {
        const leads = await getLeads({ limit: 100, filters: { assignedUserId: employee.id } });
        leadSummary = { total: leads.data.length };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
      } catch (e) {}

      return {
        employee: {
          id: employee.id,
          email: employee.email,
          status: employee.status,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
          roles: employee.userRoles.map((ur: any) => ur.role.name)
        },
        taskSummary,
        leadSummary
      };
    }
  },
  {
    ...getCanonical('getIncidentSummary'),
    parameters: { type: 'OBJECT', properties: {} },
    execute: async () => {
      return await reportingService.getSecurityMetrics();
    }
  },
  {
    ...getCanonical('getCustomerSummary'),
    parameters: { type: 'OBJECT', properties: {} },
    execute: async () => {
      return await reportingService.getCrmMetrics();
    }
  },
  {
    ...getCanonical('getCameraStatus'),
    parameters: { type: 'OBJECT', properties: {} },
    execute: async () => {
      return await reportingService.getCameraMetrics();
    }
   
  },
  {
    ...getCanonical('getCommunicationSummary'),
    parameters: { type: 'OBJECT', properties: {} },
    execute: async () => {
      return await reportingService.getCommunicationMetrics();
    }
  },
  {
    ...getCanonical('searchCustomers'),
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Search term for customer name, company, or email.' },
        limit: { type: 'INTEGER', description: 'Maximum results, default and max 10.' }
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    execute: async (args: any) => {
      const query = typeof args.query === 'string' ? args.query.slice(0, 200) : '';
      if (!query.trim()) return { ok: false, error: 'Empty query' };

      const limit = Math.min(args.limit || 10, 10);
      const res = await getCustomers({ search: query, limit });

      if (!res.data.length) {
        return { ok: false, error: 'NOT_FOUND' };
      }

      const candidates = res.data.map(c => ({
        id: c.id,
        name: c.name,
        industry: c.industry,
        status: c.status
       
      }));

      // If multiple candidates, we advise the LLM to ask user, although we still return success with the list
      return {
        ok: true,
        note: candidates.length > 1 ? 'AMBIGUOUS_ENTITY - You must ask the user to clarify which entity they mean. Do not guess.' : undefined,
        candidates
      };
    }
  },
  {
    ...getCanonical('getCustomerDetails'),
    parameters: {
      type: 'OBJECT',
      properties: {
        customerId: { type: 'STRING', description: 'The unique ID of the customer.' }
      }
    },
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    execute: async (args: any) => {
      if (!args.customerId) return { ok: false, error: 'Missing customerId' };
      const details = await getCustomerById(args.customerId);
      if (!details) return { ok: false, error: 'ENTITY_NOT_FOUND' };

      // Bound the payload returned to Gemini to avoid blowing up the context window
      return {
        ok: true,
        data: {
          id: details.id,
          name: details.name,
          industry: details.industry,
          status: details.status,
          createdAt: details.createdAt,
          assignedUser: details.assignedUser,
          counts: details._count,
           
          contacts: details.contacts.slice(0, 10).map(c => ({ name: c.firstName + ' ' + c.lastName, email: c.email, phone: c.phone, isPrimary: c.isPrimary })),
          locations: details.locations.slice(0, 5).map(l => ({ name: l.name, city: l.city, state: l.state })),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
          recentTasks: details.tasks.slice(0, 10).map((t: any) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority })),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
          relatedLeads: details.relatedLeads.slice(0, 10).map((l: any) => ({ id: l.id, name: l.name, company: l.company, status: l.status })),
          recentActivities: [], // Timeline loaded separately now to prevent large nested graphs
          recentCommunications: [] // Timeline loaded separately now
        }
      };
    }
  },
  {
    ...getCanonical('searchLeads'),
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Search term for lead name, company, or email.' },
        limit: { type: 'INTEGER', description: 'Maximum results, default and max 10.' }
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    execute: async (args: any) => {
      const query = typeof args.query === 'string' ? args.query.slice(0, 200) : '';
      if (!query.trim()) return { ok: false, error: 'Empty query' };

      const limit = Math.min(args.limit || 10, 10);
      const res = await getLeads({ search: query, limit });

      if (!res.data.length) {
        return { ok: false, error: 'NOT_FOUND' };
      }

      const candidates = res.data.map(l => ({
         
        id: l.id,
        name: l.name,
        company: l.company,
        email: l.email,
        status: l.status
      }));

      return {
        ok: true,
        note: candidates.length > 1 ? 'AMBIGUOUS_ENTITY - You must ask the user to clarify which entity they mean. Do not guess.' : undefined,
        candidates
      };
    }
  },
  {
    ...getCanonical('getLeadDetails'),
    parameters: {
      type: 'OBJECT',
      properties: {
        leadId: { type: 'STRING', description: 'The unique ID of the lead.' }
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    execute: async (args: any) => {
      if (!args.leadId) return { ok: false, error: 'Missing leadId' };
      const details = await getLeadById(args.leadId);
      if (!details) return { ok: false, error: 'ENTITY_NOT_FOUND' };

      return {
        ok: true,
        data: {
          id: details.id,
          name: details.name,
           
          company: details.company,
          email: details.email,
          phone: details.phone,
          status: details.status,
          createdAt: details.createdAt,
          assignedUser: details.assignedUser,
          counts: details._count,
          relatedCustomer: details.relatedCustomer,
          recentTasks: details.tasks.slice(0, 10).map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority })),
          recentDeals: details.deals.slice(0, 5).map(d => ({ id: d.id, title: d.title, value: d.value, stageId: d.stageId, status: d.status })),
          recentActivities: details.activities.slice(0, 10).map(a => ({ type: a.type, content: a.content, createdAt: a.createdAt }))
        }
      };
    }
  },
  {
    ...getCanonical('getLeadConversionMetrics'),
    parameters: {
      type: 'OBJECT',
      properties: {
        timeframe: { type: 'STRING', description: 'A semantic timeframe (e.g., "today", "this_week", "this_month", "this_quarter"). Do not generate ISO dates.' }
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    execute: async (args: any) => {
      const bounds = resolveDateRange(args.timeframe);
      const data = await reportingService.getLeadConversionMetrics(bounds?.startDate, bounds?.endDate);
      return { ok: true, data };
     
    }
  },
  {
    ...getCanonical('getOverdueTaskDistribution'),
    parameters: {
      type: 'OBJECT',
      properties: {}
    },
    execute: async () => {
      const data = await reportingService.getOverdueTaskDistribution();
      return { ok: true, data };
    }
  },
  {
    name: 'getMyAggregateMetrics',
    description: 'Get personal aggregate metrics for the currently authenticated user (open leads, tasks, overdue tasks).',
    requiredResource: 'SYSTEM', // Baseline functionality safe for all users
    requiredAction: 'READ',
    parameters: {
       
      type: 'OBJECT',
      properties: {
        timeframe: { type: 'STRING', description: 'A semantic timeframe. Do not generate ISO dates.' }
       
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    execute: async (args: any) => {
      const bounds = resolveDateRange(args.timeframe);
      const data = await reportingService.getMyAggregateMetrics(bounds?.startDate, bounds?.endDate);
      return { ok: true, data };
    }
  },
  {
    ...getCanonical('searchTasks'),
    parameters: {
      type: 'OBJECT',
      properties: {
        customerId: { type: 'STRING', description: 'Filter by customer ID' },
        leadId: { type: 'STRING', description: 'Filter by lead ID' },
        assignedUserId: { type: 'STRING', description: 'Filter by assigned employee ID' },
        status: { type: 'STRING', description: 'Filter by status (PENDING, IN_PROGRESS, COMPLETED)' },
        priority: { type: 'STRING', description: 'Filter by priority (LOW, MEDIUM, HIGH, URGENT)' },
        limit: { type: 'INTEGER', description: 'Maximum results, default and max 50' }
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    execute: async (args: any) => {
      const limit = Math.min(args.limit || 50, 50);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
      const filters: any = {};
      if (args.status) filters.status = args.status;
      if (args.assignedUserId) filters.assignedUserId = args.assignedUserId;

      const res = await getTasks({
        limit,
        filters,
        customerId: args.customerId,
        leadId: args.leadId,
        priority: args.priority
      });

      if (!res.data.length) {
        return { ok: false, error: 'NOT_FOUND' };
      }

      const tasks = res.data.map(t => ({
         
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        assignedUserId: t.assignedUser?.id,
        customerId: t.customer?.id,
        leadId: t.lead?.id
      }));

      return { ok: true, data: tasks };
    }
  },
  {
    name: 'searchActivities',
    description: 'Search for recent activities related to a specific entity or actor.',
    requiredResource: 'SYSTEM', // Baseline internal permission
    requiredAction: 'READ',
    parameters: {
      type: 'OBJECT',
      properties: {
        entityType: { type: 'STRING', description: 'Filter by entity type (CUSTOMER, LEAD, TASK, etc.)' },
        entityId: { type: 'STRING', description: 'Filter by entity ID' },
        actorId: { type: 'STRING', description: 'Filter by actor/employee ID' },
        limit: { type: 'INTEGER', description: 'Maximum results, default and max 50' }
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    execute: async (args: any) => {
      const limit = Math.min(args.limit || 50, 50);
      const data = await getActivities({
        actorId: args.actorId,
        entityType: args.entityType,
        entityId: args.entityId,
        limit
      });

      if (!data.length) {
        return { ok: false, error: 'NOT_FOUND' };
      }

      const activities = data.map(a => ({
        id: a.id,
        type: a.type,
        content: a.content,
        entityType: a.entityType,
        entityId: a.entityId,
        actorId: a.actorId,
        createdAt: a.createdAt
      }));

      return { ok: true, data: activities };
    }
  }
];
