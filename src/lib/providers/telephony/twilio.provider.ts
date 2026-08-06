import twilio from 'twilio';
import { TelephonyProvider, MakeCallPayload, TelephonyProviderResponse } from './telephony.interface';
import { Logger } from '../../logger/logger';

export class TwilioProvider implements TelephonyProvider {
  private client: twilio.Twilio;
  private defaultFrom: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.defaultFrom = process.env.TWILIO_PHONE_NUMBER || '+1234567890';
    
    // In production, env validation enforces these exist
    this.client = twilio(accountSid || 'AC_test', authToken || 'test_token');
  }

  async initiateCall(tenantId: string, payload: MakeCallPayload): Promise<TelephonyProviderResponse> {
    try {
      const call = await this.client.calls.create({
        to: payload.to,
        from: payload.from || this.defaultFrom,
        url: payload.url || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/twiml`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status?tenantId=${tenantId}`,
        record: true,
        recordingStatusCallbackEvent: ['completed'],
        recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/recording?tenantId=${tenantId}`
      });
      
      Logger.info('Twilio call initiated', { tenantId, sid: call.sid });
      return { success: true, providerCallId: call.sid };
    } catch (err: any) {
      Logger.error('Twilio initiation failed', err, { tenantId });
      return { success: false, error: err.message };
    }
  }

  async endCall(providerCallId: string): Promise<boolean> {
    try {
      await this.client.calls(providerCallId).update({ status: 'completed' });
      return true;
    } catch (e) {
      Logger.error('Twilio end call failed', e as Error, { providerCallId });
      return false;
    }
  }

  async getCallStatus(providerCallId: string): Promise<string> {
    try {
      const call = await this.client.calls(providerCallId).fetch();
      return call.status;
    } catch (e) {
      return 'unknown';
    }
  }

  async fetchRecording(recordingUrl: string): Promise<Buffer> {
    return Buffer.from('mock_buffer_impl');
  }
  async makeCall(to: string, from?: string): Promise<{ success: boolean; callId?: string; error?: string }> {
    return { success: true, callId: 'mock' };
  }
  async getRecording(callId: string): Promise<{ success: boolean; recordingUrl?: string; error?: string }> {
    return { success: true, recordingUrl: 'mock' };
  }
}

export class MockTelephonyProvider implements TelephonyProvider {
  async initiateCall(tenantId: string, payload: MakeCallPayload): Promise<TelephonyProviderResponse> {
    Logger.info(`[MOCK TELEPHONY] Dialing ${payload.to}`, { tenantId });
    return { success: true, providerCallId: `mock_call_${Date.now()}` };
  }
  async endCall(sid: string) { return true; }
  async getCallStatus(sid: string) { return 'completed'; }
  async fetchRecording(url: string) { return Buffer.from('mock'); }
  async makeCall(to: string, from?: string): Promise<{ success: boolean; callId?: string; error?: string }> {
    return { success: true, callId: 'mock' };
  }
  async getRecording(callId: string): Promise<{ success: boolean; recordingUrl?: string; error?: string }> {
    return { success: true, recordingUrl: 'mock' };
  }
}
