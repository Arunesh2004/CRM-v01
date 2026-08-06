import { SubscriptionStatus, InvoiceStatus, UsageType } from '@prisma/client';
// Wait, SupportedPaymentProvider in schema is PaymentProvider. Let me use Prisma's generated types if possible, or just raw types for inputs to avoid compile errors if Prisma hasn't generated yet (though we did generate it).

export interface CreateSubscriptionInput {
  planId: string;
}

export interface UpdateSubscriptionStatusInput {
  subscriptionId: string;
  status: any; // SubscriptionStatus
}

export interface CreateInvoiceInput {
  subscriptionId: string;
  amount: number;
}

export interface UpdateInvoiceStatusInput {
  invoiceId: string;
  status: any; // InvoiceStatus
}

export interface CreatePaymentRecordInput {
  invoiceId: string;
  provider: any; // PaymentProvider
  amount: number;
  currency: string;
}

export interface RecordUsageInput {
  type: any; // UsageType
  quantity: number;
  metadata?: any;
}
