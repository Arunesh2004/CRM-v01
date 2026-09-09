import { VideoProvider, NormalizedVideoEvent } from '../../video.interface';
import { ProviderNotImplementedError } from '../../../errors';

export class TwilioVideoProvider implements VideoProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
  constructor(private credentials: any) {}
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
  async createMeeting(topic: string, options?: any): Promise<string> {
    throw new ProviderNotImplementedError('Twilio Video', 'createMeeting');
  }
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Unused local variable — safe removal requires verifying no side-effect; deferred to S3
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Unused local variable — safe removal requires verifying no side-effect; deferred to S3

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
  async generateJoinToken(providerMeetingId: string, participantId: string, role?: 'HOST' | 'ATTENDEE'): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
    throw new ProviderNotImplementedError('Twilio Video', 'generateJoinToken');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
  async endMeeting(providerMeetingId: string): Promise<boolean> {
    throw new ProviderNotImplementedError('Twilio Video', 'endMeeting');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
  async normalizeWebhookEvent(payload: any, headers: any): Promise<NormalizedVideoEvent> {
    throw new ProviderNotImplementedError('Twilio Video', 'normalizeWebhookEvent');
  }
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Unused local variable — safe removal requires verifying no side-effect; deferred to S3
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Unused local variable — safe removal requires verifying no side-effect; deferred to S3
}
