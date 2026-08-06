import { z } from 'zod';
import { LeadStatus } from '@prisma/client';

export const CreateLeadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  company: z.string().min(1, 'Company is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  assignedUserId: z.string().uuid('Invalid user ID').optional(),
}).strict();

export const UpdateLeadSchema = CreateLeadSchema.partial().extend({
  id: z.string().uuid('Invalid lead ID'),
  status: z.nativeEnum(LeadStatus).optional(),
}).strict();
