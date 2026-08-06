import { z } from 'zod';

export const CreateEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  bodyHtml: z.string().min(1, 'Email body is required'),
  customerId: z.string().uuid('Invalid customer ID').optional(),
}).strict();
