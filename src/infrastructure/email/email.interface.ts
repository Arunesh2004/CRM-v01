export interface SendEmailPayload {
  to: string | string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

export interface EmailProvider {
  /**
   * Sends an outbound email.
   * @returns providerMessageId
   */
  sendEmail(payload: SendEmailPayload): Promise<string>;

  /**
   * Normalizes an incoming webhook event from the provider.
   * Can handle both delivery status updates and inbound email parsing.
   */
  normalizeWebhookEvent(payload: any, headers: any): Promise<NormalizedEmailEvent>;
}

export interface NormalizedEmailEvent {
  providerMessageId?: string;
  type: 'DELIVERY_STATUS' | 'INBOUND_MESSAGE';
  status?: string;
  inboundData?: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  };
  rawPayload: any;
}
