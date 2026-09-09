import { EmailProvider } from './email.interface';
import { ResendProvider, MockEmailProvider } from './resend.provider';

export class EmailProviderFactory {
  static getProvider(): EmailProvider {
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.RESEND_API_KEY) {
        throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED: Production environment requires RESEND_API_KEY');
      }
      return new ResendProvider();
    }
    
    // In development or test, fall back to mock if no explicit key is configured
    if (process.env.RESEND_API_KEY) {
      return new ResendProvider();
    }
    return new MockEmailProvider();
  }
}
