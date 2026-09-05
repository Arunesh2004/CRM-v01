import { Inngest } from 'inngest';
import { SecureJobEnvelope } from './types';

// Define event payload types
export type Events = {
  'outbox.process': {
    data: SecureJobEnvelope<{ eventId: string }>;
  };
  'sla.evaluate': {
    data: SecureJobEnvelope<{ ticketId?: string }>; // Optional ticketId for single-ticket eval
  };
  'ai.scoring.calculate': {
    data: SecureJobEnvelope<{ entityId: string; entityType: 'LEAD' | 'DEAL' }>;
  };
  'webhook.ingested': {
    data: SecureJobEnvelope<{ webhookEventId: string }>;
  };
  'workflow.execute': {
    data: SecureJobEnvelope<{ workflowId: string; executionId: string }>;
  };
  'workflow.approval': {
    data: { payload: { executionId: string } };
  };
};

// Create a client to send and receive events
export const inngest = new Inngest({ 
  id: 'ai-security-crm',
  eventKey: process.env.INNGEST_EVENT_KEY || 'local',
  schemas: {
    events: {} as Events,
  },
});
