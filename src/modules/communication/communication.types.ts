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
