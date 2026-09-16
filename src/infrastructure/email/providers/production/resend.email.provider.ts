import { EmailProvider, SendEmailPayload, NormalizedEmailEvent } from '../../email.interface';
import { ProviderNotImplementedError } from '../../../errors';

export class ResendEmailProvider implements EmailProvider {
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
  constructor(private credentials: any) {}
 

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
  async sendEmail(payload: SendEmailPayload): Promise<string> {
    throw new ProviderNotImplementedError('Resend Email', 'sendEmail');
   
   
   
   
  }

   
   
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
  async normalizeWebhookEvent(payload: any, headers: any): Promise<NormalizedEmailEvent> {
     
     
    throw new ProviderNotImplementedError('Resend Email', 'normalizeWebhookEvent');
  }
}
