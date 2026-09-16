export interface VideoProvider {
  /**
   * Creates a new video meeting room.
   * @returns providerMeetingId
   */
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
   */
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  normalizeWebhookEvent(payload: any, headers: any): Promise<NormalizedVideoEvent>;
}

export interface NormalizedVideoEvent {
  providerMeetingId: string;
   
  type: 'STARTED' | 'PARTICIPANT_JOINED' | 'PARTICIPANT_LEFT' | 'RECORDING_AVAILABLE' | 'ENDED';
  participantId?: string;
  recordingUrl?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  rawPayload: any;
}
