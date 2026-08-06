import { z } from 'zod';

export const CreateInvoiceSchema = z.object({
  subscriptionId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3)
}).strict();

export const UpdateInvoiceStatusSchema = z.object({
  invoiceId: z.string().uuid(),
  status: z.enum(['DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE'])
}).strict();
