export interface MakeCallPayload {
  to: string;
  from?: string; // Overrides default tenant number
  url?: string;  // TwiML webhook URL
}

export interface TelephonyProviderResponse {
  success: boolean;
  providerCallId?: string;
  error?: string;
}

export interface TelephonyProvider {
  initiateCall(tenantId: string, payload: MakeCallPayload): Promise<TelephonyProviderResponse>;
  endCall(providerCallId: string): Promise<boolean>;
  getCallStatus(providerCallId: string): Promise<string>;
  fetchRecording(recordingUrl: string): Promise<Buffer>;
  downloadRecording(recordingUrl: string, destinationPath: string): Promise<void>;
  sendSms(tenantId: string, payload: { to: string, text: string }): Promise<{ success: boolean; error?: string }>;
}
