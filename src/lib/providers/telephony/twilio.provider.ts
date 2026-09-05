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
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status`,
        record: true,
        recordingStatusCallbackEvent: ['completed'],
        recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/recording`
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

  async downloadRecording(recordingUrl: string, destinationPath: string): Promise<void> {
    const fs = await import('fs');
    const { pipeline } = await import('stream/promises');

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;

    let parsedUrl;
    try {
      parsedUrl = new URL(recordingUrl);
    } catch (e) {
      throw new Error('Invalid recording URL format');
    }

    if (parsedUrl.hostname !== 'api.twilio.com') {
      throw new Error('Security Error: Recording URL must be api.twilio.com');
    }

    // Ensure we fetch the audio format, not metadata
    let url = parsedUrl.toString();
    if (url.endsWith('.json')) {
      url = url.replace('.json', '.wav');
    } else if (!url.endsWith('.wav') && !url.endsWith('.mp3')) {
      url = `${url}.wav`;
    }

    const response = await fetch(url, {
      headers: { 'Authorization': authHeader }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Twilio recording: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No body returned in Twilio recording response');
    }

    const fileStream = fs.createWriteStream(destinationPath);
    const { Readable } = await import('stream');
    const readable = Readable.fromWeb(response.body as any);
    await pipeline(readable, fileStream);
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

  async sendSms(tenantId: string, payload: { to: string, text: string }): Promise<{ success: boolean; error?: string }> {
    try {
      await this.client.messages.create({
        body: payload.text,
        from: this.defaultFrom,
        to: payload.to
      });
      Logger.info('Twilio SMS sent', { tenantId, to: payload.to });
      return { success: true };
    } catch (err: any) {
      Logger.error('Twilio SMS failed', err, { tenantId });
      return { success: false, error: err.message };
    }
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
  
  async downloadRecording(url: string, destPath: string) {
    const fs = await import('fs');
    fs.writeFileSync(destPath, 'mock audio content for test');
  }
  async makeCall(to: string, from?: string): Promise<{ success: boolean; callId?: string; error?: string }> {
    return { success: true, callId: 'mock' };
  }
  async getRecording(callId: string): Promise<{ success: boolean; recordingUrl?: string; error?: string }> {
    return { success: true, recordingUrl: 'mock' };
  }
  async sendSms(tenantId: string, payload: { to: string, text: string }): Promise<{ success: boolean; error?: string }> {
    Logger.info(`[MOCK TELEPHONY] Sending SMS to ${payload.to}: ${payload.text}`, { tenantId });
    // Simulate some failures for robust testing or just succeed
    if (payload.to.includes('555-0000')) {
      return { success: false, error: 'Simulated failure' };
    }
    return { success: true };
  }
}
