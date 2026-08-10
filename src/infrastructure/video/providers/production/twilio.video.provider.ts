import { VideoProvider, NormalizedVideoEvent } from '../../video.interface';
import { ProviderNotImplementedError } from '../../../errors';

export class TwilioVideoProvider implements VideoProvider {
  constructor(private credentials: any) {}

  async createMeeting(topic: string, options?: any): Promise<string> {
    throw new ProviderNotImplementedError('Twilio Video', 'createMeeting');
  }

  async generateJoinToken(providerMeetingId: string, participantId: string, role?: 'HOST' | 'ATTENDEE'): Promise<string> {
    throw new ProviderNotImplementedError('Twilio Video', 'generateJoinToken');
  }

  async endMeeting(providerMeetingId: string): Promise<boolean> {
    throw new ProviderNotImplementedError('Twilio Video', 'endMeeting');
  }

  async normalizeWebhookEvent(payload: any, headers: any): Promise<NormalizedVideoEvent> {
    throw new ProviderNotImplementedError('Twilio Video', 'normalizeWebhookEvent');
  }
}
