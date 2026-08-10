import { EmailProvider, SendEmailPayload, NormalizedEmailEvent } from '../../email.interface';
import { ProviderNotImplementedError } from '../../../errors';

export class ResendEmailProvider implements EmailProvider {
  constructor(private credentials: any) {}

  async sendEmail(payload: SendEmailPayload): Promise<string> {
    throw new ProviderNotImplementedError('Resend Email', 'sendEmail');
  }

  async normalizeWebhookEvent(payload: any, headers: any): Promise<NormalizedEmailEvent> {
    throw new ProviderNotImplementedError('Resend Email', 'normalizeWebhookEvent');
  }
}
