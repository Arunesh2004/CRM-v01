export interface TelephonyProvider {
   
   
   
   
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
  makeCall(to: any, from: any): Promise<any>;
   
   
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
  getRecording(callId: any): Promise<any>;
   
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
  initiateCall(tenantId: any, payload: any): Promise<any>;
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
  endCall(sid: any): Promise<any>;
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
  getCallStatus(sid: any): Promise<any>;
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
  fetchRecording(url: any): Promise<any>;
  sendSms(tenantId: string, payload: { to: string, text: string }): Promise<{ success: boolean; error?: string }>;
}
