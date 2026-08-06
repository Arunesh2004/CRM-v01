import { z } from 'zod';

export const CreateSubscriptionSchema = z.object({
  planId: z.string().uuid()
}).strict();

export const UpdateSubscriptionStatusSchema = z.object({
  subscriptionId: z.string().uuid(),
  status: z.enum(['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED']),
  renewalDate: z.string().datetime().optional()
}).strict();
