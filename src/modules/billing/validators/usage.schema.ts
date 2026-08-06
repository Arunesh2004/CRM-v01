import { z } from 'zod';

export const RecordUsageSchema = z.object({
  type: z.enum(['USER', 'CAMERA', 'STORAGE', 'AI_REQUEST', 'COMMUNICATION']),
  quantity: z.number().int().positive(),
  metadata: z.record(z.string(), z.any()).optional(),
  periodData: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional()
}).strict();

export const GetUsageSummarySchema = z.object({
  type: z.enum(['USER', 'CAMERA', 'STORAGE', 'AI_REQUEST', 'COMMUNICATION'])
}).strict();
