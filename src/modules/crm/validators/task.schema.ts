import { z } from 'zod';
import { TaskStatus } from '@prisma/client';

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().or(z.literal('')),
  dueDate: z.coerce.date().optional(),
  assignedUserId: z.string().uuid('Invalid user ID').optional(),
  leadId: z.string().uuid('Invalid lead ID').optional(),
  customerId: z.string().uuid('Invalid customer ID').optional(),
}).strict();

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  id: z.string().uuid('Invalid task ID'),
  status: z.nativeEnum(TaskStatus).optional(),
}).strict();
