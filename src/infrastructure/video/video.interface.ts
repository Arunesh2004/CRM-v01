export interface VideoProvider {
  /**
   * Creates a new video meeting room.
   * @returns providerMeetingId
   */
  createMeeting(topic: string, options?: any): Promise<string>;

  /**
   * Generates a join token for a specific participant.
   */
  generateJoinToken(providerMeetingId: string, participantId: string, role?: 'HOST' | 'ATTENDEE'): Promise<string>;

  /**
   * Ends an active meeting for all participants.
   */
  endMeeting(providerMeetingId: string): Promise<boolean>;

  /**
   * Normalizes an incoming webhook event from the provider.
   */
  normalizeWebhookEvent(payload: any, headers: any): Promise<NormalizedVideoEvent>;
}

export interface NormalizedVideoEvent {
  providerMeetingId: string;
  type: 'STARTED' | 'PARTICIPANT_JOINED' | 'PARTICIPANT_LEFT' | 'RECORDING_AVAILABLE' | 'ENDED';
  participantId?: string;
  recordingUrl?: string;
  rawPayload: any;
}
