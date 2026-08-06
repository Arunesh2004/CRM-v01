import { z } from 'zod';

export const CreateCallSchema = z.object({
  to: z.string().min(1, 'Recipient phone number is required'),
  from: z.string().min(1, 'Sender phone number is required'),
  contactId: z.string().uuid('Invalid contact ID').optional(),
}).strict();
