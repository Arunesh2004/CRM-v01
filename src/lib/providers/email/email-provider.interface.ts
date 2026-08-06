export interface EmailProvider {
  sendEmail(toOrTenantId: any, payloadOrSubject: any, bodyHtml: any, bodyText?: any): Promise<any>;
  verifyDomain(domain: any): Promise<any>;
  getMessageStatus(messageId: any): Promise<any>;
}
