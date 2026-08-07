export interface TelephonyProvider {
  makeCall(to: any, from: any): Promise<any>;
  getRecording(callId: any): Promise<any>;
  initiateCall(tenantId: any, payload: any): Promise<any>;
  endCall(sid: any): Promise<any>;
  getCallStatus(sid: any): Promise<any>;
  fetchRecording(url: any): Promise<any>;
  sendSms(tenantId: string, payload: { to: string, text: string }): Promise<{ success: boolean; error?: string }>;
}
