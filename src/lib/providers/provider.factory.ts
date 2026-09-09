import { EmailProvider } from './email/email.interface';
import { ResendProvider } from './email/resend.provider';
import { TelephonyProvider } from './telephony/telephony-provider.interface';
import { TwilioProvider } from './telephony/twilio.provider';
import { MessagingProvider } from './messaging/messaging-provider.interface';
import { WhatsAppProvider } from './messaging/whatsapp.provider';
import { CameraProvider } from './cctv/camera-provider.interface';
import { MockCameraProvider } from './cctv/mock.provider';

import { MockEmailProvider } from './email/resend.provider';
import { MockTelephonyProvider } from './telephony/twilio.provider';
import { MockMessagingProvider } from './messaging/whatsapp.provider';

export class ProviderFactory {
  static getEmailProvider(): EmailProvider {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
      if (!process.env.RESEND_API_KEY) {
        throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED: Production environment requires RESEND_API_KEY');
      }
      return new ResendProvider();
    }
    if (process.env.APP_MODE === 'demo' || !process.env.RESEND_API_KEY) return new MockEmailProvider();
    return new ResendProvider();
  }

  static getTelephonyProvider(): TelephonyProvider {
    if (process.env.APP_MODE === 'demo') return new MockTelephonyProvider();
    return new TwilioProvider();
  }

  static getMessagingProvider(): MessagingProvider {
    if (process.env.APP_MODE === 'demo') return new MockMessagingProvider();
    return new WhatsAppProvider();
  }

  static getCameraProvider(): CameraProvider {
    return new MockCameraProvider();
  }
}
