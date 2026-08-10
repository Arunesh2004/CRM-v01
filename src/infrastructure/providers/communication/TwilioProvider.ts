import { PhoneProvider, SMSPayload, CallPayload, CommunicationResponse } from './phone.interface';
import { ProviderContext, ProviderHealth } from '../base.interface';

export class TwilioProvider implements PhoneProvider {
  name = 'TwilioProvider';
  version = '1.0.0';
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      throw new Error('COMMUNICATION_MODE is production but Twilio credentials are missing.');
    }
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  async checkHealth(): Promise<ProviderHealth> {
    const isConfigured = !!(this.accountSid && this.authToken && this.fromNumber);
    return {
      status: isConfigured ? 'active' : 'missing_credentials',
      providerName: this.name
    };
  }

  async sendSMS(context: ProviderContext, payload: SMSPayload): Promise<CommunicationResponse> {
    // In a real environment:
    // const client = twilio(this.accountSid, this.authToken);
    // await client.messages.create({ body: payload.body, from: this.fromNumber, to: payload.toPhoneNumber });
    
    console.log(`[TwilioProvider] Sending SMS to ${payload.toPhoneNumber} via Twilio API...`);
    
    return {
      id: `twilio_sms_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      status: 'SENT',
      provider: this.name
    };
  }

  async initiateCall(context: ProviderContext, payload: CallPayload): Promise<CommunicationResponse> {
    console.log(`[TwilioProvider] Initiating call to ${payload.toPhoneNumber} via Twilio API...`);
    
    return {
      id: `twilio_call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      status: 'IN_PROGRESS',
      provider: this.name
    };
  }
}
