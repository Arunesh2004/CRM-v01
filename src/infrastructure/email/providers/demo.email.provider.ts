import { EmailProvider, SendEmailPayload, NormalizedEmailEvent } from '../email.interface';
import crypto from 'crypto';

export class DemoEmailProvider implements EmailProvider {
  constructor(private tenantId: string) {}

  async sendEmail(payload: SendEmailPayload): Promise<string> {
    const providerMessageId = `demo_email_${crypto.randomBytes(8).toString('hex')}`;
    const toStr = Array.isArray(payload.to) ? payload.to.join(', ') : payload.to;
    console.log(`[DEMO EMAIL] Simulating send from ${payload.from} to ${toStr} - Subject: ${payload.subject}`);
    
    // Simulate provider latency
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return providerMessageId;
  }

  async normalizeWebhookEvent(payload: any, headers: any): Promise<NormalizedEmailEvent> {
    return {
      providerMessageId: payload.messageId || 'demo_email',
      type: 'DELIVERY_STATUS',
      status: 'DELIVERED',
      rawPayload: payload
    };
  }
}
