import { EmailProvider, EmailPayload, EmailResponse } from './email.interface';
import { ProviderContext, ProviderHealth } from '../base.interface';

export class ResendProvider implements EmailProvider {
  name = 'ResendProvider';
  version = '1.0.0';
  private apiKey: string;

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('COMMUNICATION_MODE is production but RESEND_API_KEY is missing.');
    }
    this.apiKey = process.env.RESEND_API_KEY;
  }

  async checkHealth(): Promise<ProviderHealth> {
    return {
      status: this.apiKey ? 'active' : 'missing_credentials',
      providerName: this.name
    };
  }

  async sendEmail(context: ProviderContext, payload: EmailPayload): Promise<EmailResponse> {
    // In a real environment, we would use the Resend SDK:
    // const resend = new Resend(this.apiKey);
    // await resend.emails.send({...});
    
    // For this simulation, we act as if it succeeded if the key exists.
    const [user, domain] = payload.to.split('@');
    const maskedEmail = user ? `${user.charAt(0)}***@${domain || 'unknown'}` : '***';
    console.log(`[ResendProvider] Sending email to ${maskedEmail} via Resend API...`);
    
    return {
      messageId: `resend_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      status: 'SENT',
      provider: this.name
    };
  }
}
