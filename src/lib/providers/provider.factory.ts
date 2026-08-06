import { EmailProvider } from './email/email-provider.interface';
import { ResendProvider } from './email/resend.provider';
import { TelephonyProvider } from './telephony/telephony-provider.interface';
import { TwilioProvider } from './telephony/twilio.provider';
import { MessagingProvider } from './messaging/messaging-provider.interface';
import { WhatsAppProvider } from './messaging/whatsapp.provider';
import { CameraProvider } from './cctv/camera-provider.interface';
import { MockCameraProvider } from './cctv/mock.provider';

export class ProviderFactory {
  static getEmailProvider(): EmailProvider {
    return new ResendProvider();
  }

  static getTelephonyProvider(): TelephonyProvider {
    return new TwilioProvider();
  }

  static getMessagingProvider(): MessagingProvider {
    return new WhatsAppProvider();
  }

  static getCameraProvider(): CameraProvider {
    return new MockCameraProvider();
  }
}
