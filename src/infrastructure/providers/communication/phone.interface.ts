import { BaseProvider, ProviderContext } from '../base.interface';

export interface SMSPayload {
  toPhoneNumber: string;
  body: string;
}

export interface CallPayload {
  toPhoneNumber: string;
}

export interface CommunicationResponse {
  id: string;
  status: 'SENT' | 'QUEUED' | 'FAILED' | 'IN_PROGRESS' | 'COMPLETED';
  provider: string;
}

export interface PhoneProvider extends BaseProvider {
  sendSMS(context: ProviderContext, payload: SMSPayload): Promise<CommunicationResponse>;
  initiateCall(context: ProviderContext, payload: CallPayload): Promise<CommunicationResponse>;
}
