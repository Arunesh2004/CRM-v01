import { Quote, QuoteLineItem, Tenant, Customer, User } from '@prisma/client';

export interface QuoteSnapshot {
  quote: Quote;
  lineItems: QuoteLineItem[];
  tenant: Tenant;
  customer: Customer;
  owner: User;
}

export interface DocumentProvider {
  generateQuoteDocument(snapshot: QuoteSnapshot): Promise<Uint8Array>;
}

import { PdfGeneratorProvider } from './pdf-generator.provider';

export class DocumentProviderFactory {
  static getProvider(): DocumentProvider {
    return new PdfGeneratorProvider();
  }
}
