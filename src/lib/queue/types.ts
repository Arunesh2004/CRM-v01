import { z } from 'zod';

export const SecureJobEnvelopeSchema = z.object({
  jobId: z.string().uuid(),
  tenantId: z.string().uuid(),
  actorType: z.enum(['SYSTEM', 'USER', 'AI']),
  actorId: z.string().optional(),
  correlationId: z.string(),
  jobType: z.string(),
  payload: z.any(),
  schemaVersion: z.literal('1.0'),
});

export type SecureJobEnvelope<T = any> = {
  jobId: string;
  tenantId: string;
  actorType: 'SYSTEM' | 'USER' | 'AI';
  actorId?: string;
  correlationId: string;
  jobType: string;
  payload: T;
  schemaVersion: '1.0';
};
