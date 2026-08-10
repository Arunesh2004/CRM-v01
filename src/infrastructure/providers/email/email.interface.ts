import { BaseProvider, ProviderContext } from '../base.interface';

export interface EmailPayload {
  to: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
}

export interface EmailResponse {
  messageId: string;
  status: 'SENT' | 'QUEUED' | 'FAILED';
  provider: string;
}

export interface EmailProvider extends BaseProvider {
  sendEmail(context: ProviderContext, payload: EmailPayload): Promise<EmailResponse>;
}
