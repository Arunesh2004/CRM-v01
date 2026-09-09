export interface CallParticipantConfig {
  phoneNumber: string;
  userId?: string;
  contactId?: string;
}

export interface CallProvider {
  /**
   * Initiates an outbound call.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  normalizeWebhookEvent(payload: any, headers: any): Promise<NormalizedCallEvent>;
}

export interface NormalizedCallEvent {
  providerCallId: string;
  type: 'STATUS_CHANGE' | 'RECORDING_AVAILABLE' | 'COMPLETED';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  status?: string;
  duration?: number;
  recordingUrl?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  rawPayload: any;
}
