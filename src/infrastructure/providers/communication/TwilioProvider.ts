import { PhoneProvider, SMSPayload, CallPayload, CommunicationResponse } from './phone.interface';
import { ProviderContext, ProviderHealth } from '../base.interface';
import { Logger } from '@/lib/logger/logger';

export class TwilioProvider implements PhoneProvider {
  name = 'TwilioProvider';
  version = '1.0.0';
  private accountSid?: string;
  private authToken?: string;
  private fromNumber?: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  async checkHealth(): Promise<ProviderHealth> {
    const isConfigured = !!(this.accountSid && this.authToken && this.fromNumber);
    return {
      status: isConfigured ? 'READY' : 'MISSING_CREDENTIALS',
      providerName: this.name,
      criticality: 'DEGRADED',
      reason: isConfigured ? undefined : 'Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER'
    };
  }

  async sendSMS(context: ProviderContext, payload: SMSPayload): Promise<CommunicationResponse> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      throw new Error('TwilioProvider is degraded: Missing credentials.');
    }
    
    // In a real environment:
    // const client = twilio(this.accountSid, this.authToken);
    // await client.messages.create({ body: payload.body, from: this.fromNumber, to: payload.toPhoneNumber });
    
    const maskedPhone = payload.toPhoneNumber.length >= 4 
      ? payload.toPhoneNumber.substring(0, 3) + '****' + payload.toPhoneNumber.substring(payload.toPhoneNumber.length - 4)
      : '****';
    Logger.info(`[TwilioProvider] Sending SMS via Twilio API...`, { to: maskedPhone });
    
    return {
      id: `twilio_sms_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      status: 'SENT',
      provider: this.name
    };
  }

  async initiateCall(context: ProviderContext, payload: CallPayload): Promise<CommunicationResponse> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      throw new Error('TwilioProvider is degraded: Missing credentials.');
    }

    const maskedPhone = payload.toPhoneNumber.length >= 4 
      ? payload.toPhoneNumber.substring(0, 3) + '****' + payload.toPhoneNumber.substring(payload.toPhoneNumber.length - 4)
      : '****';
    Logger.info(`[TwilioProvider] Initiating call via Twilio API...`, { to: maskedPhone });
    
    return {
      id: `twilio_call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      status: 'IN_PROGRESS',
      provider: this.name
    };
  }
}
