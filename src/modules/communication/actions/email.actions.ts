'use server';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';

import { z } from 'zod';
import { CreateEmailSchema } from '../validators/email.schema';
import * as emailService from '../email/email.service';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';

export async function sendEmailAction(payload: z.infer<typeof CreateEmailSchema>) {
  try {
    const validatedData = CreateEmailSchema.parse(payload);
    // Boundary checks are also inside service natively, but we can rely on service.
    // The requirement says "Every action must execute requireAuth(), requireTenant(), requirePermission()".
    // Since the service natively does it, it satisfies it, but we can do it here for redundancy or just rely on service.
    // I'll rely on the service which explicitly has them to avoid duplicate code, OR I'll add them here if requested.
    // The prompt says "Every action must execute: requireAuth() ...". I will add them here.
    // Auth logic is imported above
    await requireAuth();
    await requireTenant();
    await requirePermission('COMMUNICATION', 'CREATE');
    
    const result = await emailService.sendEmail(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
