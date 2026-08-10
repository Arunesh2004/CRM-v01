// General communication payloads
export interface CreateEmailInput {
  to: string;
  subject: string;
  bodyHtml: string;
  customerId?: string;
}

export interface CreateCallInput {
  to: string;
  from: string;
  contactId?: string;
}

export interface CreateMessageInput {
  conversationId: string;
  content: string;
}

// ---------------------------------------------------------
// Internal vs External Architecture (Phase R.2 Abstraction)
// ---------------------------------------------------------

/**
 * Internal Communication (Employee <-> Employee)
 * Designed for future WebRTC or internal pub/sub sockets.
 * Does not use external providers (Twilio/Resend).
 */
export interface InternalCommunication {
  senderEmployeeId: string;
  receiverEmployeeId: string;
  channel: 'CHAT' | 'VOICE_CALL' | 'VIDEO_CALL';
  payload: any;
}

/**
 * External Communication (Employee <-> Customer)
 * Handled exclusively through the Provider Abstraction Layer (EmailProvider, PhoneProvider).
 */
export interface ExternalCommunication {
  tenantId: string;
  actorId: string;
  providerType: 'EMAIL' | 'PHONE' | 'WHATSAPP';
  payload: CreateEmailInput | CreateCallInput; // simplified mapping
}
