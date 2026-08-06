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
    if (process.env.APP_MODE === 'demo') return new MockEmailProvider();
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
