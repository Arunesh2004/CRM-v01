import { PhoneProvider, SMSPayload, CallPayload, CommunicationResponse } from './phone.interface';
import { ProviderContext, ProviderHealth } from '../base.interface';
import { randomUUID } from 'crypto';

export class DemoPhoneProvider implements PhoneProvider {
  async checkHealth(): Promise<ProviderHealth> {
    return {
      status: 'active',
      providerName: 'DemoPhoneProvider',
      message: 'Running in local simulation mode'
    };
  }

  async sendSMS(context: ProviderContext, payload: SMSPayload): Promise<CommunicationResponse> {
    console.log(`[DEMO_SMS] Sending SMS to ${payload.toPhoneNumber}: ${payload.body}`);
    const messageId = `demo_sms_${randomUUID()}`;

    return {
      id: messageId,
      status: 'SENT',
      provider: 'DemoPhoneProvider'
    };
  }

  async initiateCall(context: ProviderContext, payload: CallPayload): Promise<CommunicationResponse> {
    console.log(`[DEMO_CALL] Initiating call to ${payload.toPhoneNumber}`);
    const callId = `demo_call_${randomUUID()}`;

    return {
      id: callId,
      status: 'COMPLETED',
      provider: 'DemoPhoneProvider'
    };
  }
}

