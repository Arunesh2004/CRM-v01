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
    if (!process.env.RESEND_API_KEY) {
      return new MockEmailProvider();
    }
    if (process.env.APP_MODE === 'demo') return new MockEmailProvider();
    return new ResendProvider();
  }

  static getTelephonyProvider(): TelephonyProvider {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return new MockTelephonyProvider();
    }
    if (process.env.APP_MODE === 'demo') return new MockTelephonyProvider();
    return new TwilioProvider();
  }

  static getMessagingProvider(): MessagingProvider {
    if (!process.env.WHATSAPP_TOKEN) {
      return new MockMessagingProvider();
    }
    if (process.env.APP_MODE === 'demo') return new MockMessagingProvider();
    return new WhatsAppProvider();
  }

  static getCameraProvider(): CameraProvider {
    return new MockCameraProvider();
  }
}
