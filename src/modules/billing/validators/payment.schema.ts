import { z } from 'zod';

export const CreatePaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  provider: z.enum(['RAZORPAY', 'STRIPE', 'PAYPAL']),
  amount: z.number().positive(),
  currency: z.string().length(3)
}).strict();

export const HandlePaymentSuccessSchema = z.object({
  transactionId: z.string() // string id from provider might not be uuid
}).strict();
