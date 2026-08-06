import { TelephonyProvider } from './telephony.interface';
import { TwilioProvider, MockTelephonyProvider } from './twilio.provider';

export class TelephonyProviderFactory {
  static getProvider(): TelephonyProvider {
    if (process.env.NODE_ENV === 'production' && process.env.TWILIO_ACCOUNT_SID) {
      return new TwilioProvider();
    }
    return new MockTelephonyProvider();
  }
}
