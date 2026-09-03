import { EmailProvider, EmailPayload, EmailResponse } from './email.interface';
import { ProviderContext, ProviderHealth } from '../base.interface';
import { randomUUID } from 'crypto';

export class DemoEmailProvider implements EmailProvider {
  async checkHealth(): Promise<ProviderHealth> {
    return {
      status: 'READY',
      providerName: 'DemoEmailProvider',
      criticality: 'DEGRADED',
    };
  }

  async sendEmail(context: ProviderContext, payload: EmailPayload): Promise<EmailResponse> {
    console.log(`[DEMO_EMAIL] Sending email to ${payload.to} with subject: ${payload.subject}`);
    const messageId = `demo_msg_${randomUUID()}`;

    // Business logic (AuditLog, Timeline, DB records) has been moved to the Communication Service Layer.
    // Provider strictly returns successful transport mock.

    return {
      messageId,
      status: 'SENT',
      provider: 'DemoEmailProvider'
    };
  }
}

