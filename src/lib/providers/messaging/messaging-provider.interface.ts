export interface MessagingProvider {
  sendMessage(toOrTenantId: any, payloadOrContent: any): Promise<any>;
  receiveWebhook(payload: any): Promise<any>;
  verifyWebhook(signature: any, payload: any): Promise<any>;
}
