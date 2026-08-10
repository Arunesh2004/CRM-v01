export interface CallParticipantConfig {
  phoneNumber: string;
  userId?: string;
  contactId?: string;
}

export interface CallProvider {
  /**
   * Initiates an outbound call.
   */
  startCall(from: string, to: string, options?: any): Promise<string>;

  /**
   * Ends an active call.
   */
  endCall(providerCallId: string): Promise<boolean>;

  /**
   * Generates a client token for WebRTC calling (e.g. Twilio Client).
   */
  generateClientToken(userId: string): Promise<string>;

  /**
   * Normalizes an incoming webhook event from the provider into a standard internal format.
   */
  normalizeWebhookEvent(payload: any, headers: any): Promise<NormalizedCallEvent>;
}

export interface NormalizedCallEvent {
  providerCallId: string;
  type: 'STATUS_CHANGE' | 'RECORDING_AVAILABLE' | 'COMPLETED';
  status?: string;
  duration?: number;
  recordingUrl?: string;
  rawPayload: any;
}
