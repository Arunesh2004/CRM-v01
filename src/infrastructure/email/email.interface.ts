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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    html: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  rawPayload: any;
}
