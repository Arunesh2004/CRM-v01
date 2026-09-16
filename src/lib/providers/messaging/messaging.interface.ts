export interface SendWhatsAppPayload {
  to: string;
  type: 'text' | 'image' | 'document' | 'template';
  text?: string;
  mediaUrl?: string; // used for image/document
  mediaId?: string; // used for pre-uploaded media
  templateName?: string;
  templateLanguage?: string;
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
  templateComponents?: any[];
}

export interface MessagingProviderResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface MessagingProvider {
  sendMessage(tenantId: string, payload: SendWhatsAppPayload): Promise<MessagingProviderResponse>;
}
