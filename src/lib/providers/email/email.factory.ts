import { EmailProvider } from './email.interface';
import { ResendProvider, MockEmailProvider } from './resend.provider';

export class EmailProviderFactory {
  static getProvider(): EmailProvider {
    if (process.env.NODE_ENV === 'production' && process.env.RESEND_API_KEY) {
      return new ResendProvider();
    }
    return new MockEmailProvider();
  }
}
