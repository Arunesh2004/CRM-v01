import { CallProvider, NormalizedCallEvent } from '../../call.interface';
import { ProviderNotImplementedError } from '../../../errors';

export class TwilioCallProvider implements CallProvider {
  constructor(private credentials: any) {}

  async startCall(from: string, to: string, options?: any): Promise<string> {
    throw new ProviderNotImplementedError('Twilio Call', 'startCall');
  }

  async endCall(providerCallId: string): Promise<boolean> {
    throw new ProviderNotImplementedError('Twilio Call', 'endCall');
  }

  async generateClientToken(userId: string): Promise<string> {
    throw new ProviderNotImplementedError('Twilio Call', 'generateClientToken');
  }

  async normalizeWebhookEvent(payload: any, headers: any): Promise<NormalizedCallEvent> {
    throw new ProviderNotImplementedError('Twilio Call', 'normalizeWebhookEvent');
  }
}
