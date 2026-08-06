import { z } from 'zod';

export const MarkNotificationReadSchema = z.object({
  notificationId: z.string().uuid('Invalid notification ID'),
}).strict();
