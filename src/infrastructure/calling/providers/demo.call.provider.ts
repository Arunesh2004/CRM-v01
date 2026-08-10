import { CallProvider, NormalizedCallEvent } from '../call.interface';
import crypto from 'crypto';

export class DemoCallProvider implements CallProvider {
  constructor(private tenantId: string) {}

  async startCall(from: string, to: string, options?: any): Promise<string> {
    const providerCallId = `demo_call_${crypto.randomBytes(8).toString('hex')}`;
    // Simulate provider latency
    console.log(`[DEMO CALL] Initiating call from ${from} to ${to}`);
    await new Promise(resolve => setTimeout(resolve, 1000));


    return providerCallId;
  }

  async endCall(providerCallId: string): Promise<boolean> {
    console.log(`[DEMO CALL] Ended call ${providerCallId}`);
    return true;
  }

  async generateClientToken(userId: string): Promise<string> {
    return `demo_token_for_${userId}`;
  }

  async normalizeWebhookEvent(payload: any, headers: any): Promise<NormalizedCallEvent> {
    // In demo mode, we might hit an endpoint manually to simulate a webhook
    return {
      providerCallId: payload.CallSid || 'demo_call',
      type: 'STATUS_CHANGE',
      status: payload.CallStatus || 'completed',
      rawPayload: payload
    };
  }
}
