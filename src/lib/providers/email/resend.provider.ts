import { Resend } from 'resend';
import { EmailProvider, EmailPayload, EmailProviderResponse } from './email.interface';
import { Logger } from '../../logger/logger';

export class ResendProvider implements EmailProvider {
  private resend: Resend;
  private defaultFrom: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey && process.env.NODE_ENV === 'production') {
      Logger.fatal('Resend API key missing', new Error('RESEND_API_KEY is not defined in the environment.'));
    }
    
    this.resend = new Resend(apiKey || 're_test_123'); // Fallback for tests
    this.defaultFrom = process.env.EMAIL_FROM_ADDRESS || 'noreply@saas.com';
  }

  async sendEmail(tenantId: string, payload: EmailPayload): Promise<EmailProviderResponse> {
    try {
      const response = await this.resend.emails.send({
        from: payload.from || this.defaultFrom,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        replyTo: payload.replyTo,
        tags: [
          { name: 'tenantId', value: tenantId }
        ]
      });

      if (response.error) {
        Logger.error('Resend API Error', new Error(response.error.message), { tenantId, payload });
        return { success: false, error: response.error.message };
      }

      Logger.info(`Email dispatched successfully via Resend`, { tenantId, messageId: response.data?.id });
      return { success: true, messageId: response.data?.id };

    } catch (err: any) {
      Logger.error('Resend unexpected failure', err, { tenantId });
      return { success: false, error: err.message };
    }
  }

  async verifyDomain(domain: string): Promise<{ success: boolean; status: string; error?: string }> {
    return { success: true, status: 'verified' };
  }
  async getMessageStatus(messageId: string): Promise<{ success: boolean; status: string; error?: string }> {
    return { success: true, status: 'delivered' };
  }
}

export class MockEmailProvider implements EmailProvider {
  async sendEmail(tenantId: string, payload: EmailPayload): Promise<EmailProviderResponse> {
    Logger.info(`[MOCK EMAIL] Sent to ${payload.to}`, { tenantId, subject: payload.subject });
    return { success: true, messageId: `mock_${Date.now()}` };
  }
  async verifyDomain(domain: string): Promise<{ success: boolean; status: string; error?: string }> {
    return { success: true, status: 'verified' };
  }
  async getMessageStatus(messageId: string): Promise<{ success: boolean; status: string; error?: string }> {
    return { success: true, status: 'delivered' };
  }
}
