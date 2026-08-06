import { z } from 'zod';

export const CreateMessageSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  content: z.string().min(1, 'Message content is required'),
}).strict();
