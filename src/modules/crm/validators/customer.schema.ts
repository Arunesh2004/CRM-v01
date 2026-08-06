import { z } from 'zod';
import { CustomerStatus } from '@prisma/client';

export const CreateCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  industry: z.string().optional().or(z.literal('')),
  assignedUserId: z.string().uuid('Invalid user ID').optional(),
}).strict();

export const UpdateCustomerSchema = CreateCustomerSchema.partial().extend({
  id: z.string().uuid('Invalid customer ID'),
  status: z.nativeEnum(CustomerStatus).optional(),
}).strict();
