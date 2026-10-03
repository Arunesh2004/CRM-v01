import { Resource, Action } from '@prisma/client';

export interface CanonicalAITool {
  name: string;
  description: string;
  requiredResource: Resource;
  requiredAction: Action;
  requiresApproval: boolean;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  parameters?: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export const CANONICAL_AI_TOOLS: CanonicalAITool[] = [
  // --- WORKFLOW TOOLS ---
  {
    name: 'CREATE_TASK',
    description: 'Creates a task in the CRM',
    requiredResource: 'TASK',
    requiredAction: 'CREATE',
    requiresApproval: false,
    riskLevel: 'MODERATE',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'string', description: 'Title of the task' },
        description: { type: 'string', description: 'Optional description of the task' },
        dueDate: { type: 'string', description: 'Optional due date for the task' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], description: 'Optional priority' },
        assignedUserId: { type: 'string', description: 'Optional assigned user ID' },
        leadId: { type: 'string', description: 'Optional lead ID' },
        customerId: { type: 'string', description: 'Optional customer ID' }
      },
      required: ['title']
    }
  },
  {
    name: 'CREATE_TICKET',
    description: 'Creates a support ticket',
    requiredResource: 'TICKET',
    requiredAction: 'CREATE',
    requiresApproval: false,
    riskLevel: 'MODERATE',
    parameters: {
      type: 'OBJECT',
      properties: {
        customerId: { type: 'string', description: 'ID of the customer' },
        subject: { type: 'string', description: 'Subject of the ticket' },
        description: { type: 'string', description: 'Description of the issue' },
        priority: { type: 'string', description: 'Priority of the ticket' }
      },
      required: ['customerId', 'subject', 'description', 'priority']
    }
  },
  {
    name: 'CREATE_INCIDENT',
    description: 'Creates a security incident',
    requiredResource: 'INCIDENT',
    requiredAction: 'CREATE',
    requiresApproval: false,
    riskLevel: 'HIGH',
    parameters: {
      type: 'OBJECT',
      properties: {
        locationId: { type: 'string', description: 'ID of the location' },
        cameraId: { type: 'string', description: 'ID of the camera' },
        aiEventId: { type: 'string', description: 'ID of the AI Event' },
        title: { type: 'string', description: 'Title of the incident' },
        description: { type: 'string', description: 'Optional description of the incident' },
        severity: { type: 'string', enum: ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], description: 'Severity of the incident' }
      },
      required: ['locationId', 'cameraId', 'aiEventId', 'title', 'severity']
    }
  },
  
  // --- CRM TOOLS ---
  {
    name: 'search_crm',
    description: 'Searches across CRM for customers, leads, tasks, and communications.',
    requiredResource: 'CUSTOMER',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'get_customer',
    description: 'Retrieves details about a specific customer by ID.',
    requiredResource: 'CUSTOMER',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'update_lead',
    description: 'Updates a lead status.',
    requiredResource: 'LEAD',
    requiredAction: 'UPDATE',
    requiresApproval: true,
    riskLevel: 'MODERATE'
  },
  
  // --- SECURE TOOLS ---
  {
    name: 'getMyTasks',
    description: 'Get the tasks assigned to the currently authenticated user.',
    requiredResource: 'TASK',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'getMyLeads',
    description: 'Get the leads assigned to the currently authenticated user.',
    requiredResource: 'LEAD',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'getMyCustomers',
    description: 'Get the customers assigned to the currently authenticated user.',
    requiredResource: 'CUSTOMER',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'getMyActivity',
    description: 'Get the recent activity timeline for the currently authenticated user.',
    requiredResource: 'SYSTEM',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'getMyNotifications',
    description: 'Get the recent notifications for the currently authenticated user.',
    requiredResource: 'SYSTEM',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'getEmployeeSummary',
    description: 'Lookup an employee (requires special permissions) and get a summary of their tasks, leads, and basic info.',
    requiredResource: 'USER',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'getIncidentSummary',
    description: 'Get a summary of security incidents including total, open, critical, and resolved counts.',
    requiredResource: 'INCIDENT',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'getCustomerSummary',
    description: 'Get a summary of CRM data including leads, customers, and conversion rates.',
    requiredResource: 'CUSTOMER',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'getCameraStatus',
    description: 'Get the total number of cameras, active streams, and offline cameras.',
    requiredResource: 'CAMERA',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'getCommunicationSummary',
    description: 'Get statistics about dispatched notifications (email, sms, whatsapp) and success rates.',
    requiredResource: 'COMMUNICATION',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'searchCustomers',
    description: 'Search for customers by name or company name across the CRM.',
    requiredResource: 'CUSTOMER',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'getCustomerDetails',
    description: 'Get deep-dive details for a specific customer by ID.',
    requiredResource: 'CUSTOMER',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'searchLeads',
    description: 'Search for leads by name, company, or email across the CRM.',
    requiredResource: 'LEAD',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'getLeadDetails',
    description: 'Get deep-dive details for a specific lead by ID.',
    requiredResource: 'LEAD',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'getLeadConversionMetrics',
    description: 'Get aggregate metrics on lead conversion and pipeline status distribution.',
    requiredResource: 'LEAD',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'getOverdueTaskDistribution',
    description: 'Get a distribution of overdue tasks grouped by assigned employee.',
    requiredResource: 'TASK',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'getMyAggregateMetrics',
    description: 'Get personal aggregate metrics for the currently authenticated user (open leads, tasks, overdue tasks).',
    requiredResource: 'SYSTEM',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'searchTasks',
    description: 'Search for tasks by various filters, including customer, lead, user, or status.',
    requiredResource: 'TASK',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  },
  {
    name: 'searchActivities',
    description: 'Search for recent activities related to a specific entity or actor.',
    requiredResource: 'SYSTEM',
    requiredAction: 'READ',
    requiresApproval: false,
    riskLevel: 'LOW'
  }
];
