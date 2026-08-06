'use server';
import { z } from 'zod';
import { RecordUsageSchema, GetUsageSummarySchema } from '../validators/usage.schema';
import * as usageService from '../usage/usage.service';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';

export async function recordUsageAction(payload: z.infer<typeof RecordUsageSchema>) {
  try {
    const validatedData = RecordUsageSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    await requirePermission('BILLING', 'UPDATE');
    
    const result = await usageService.recordUsage(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal error' };
  }
}

export async function getUsageSummaryAction(payload: z.infer<typeof GetUsageSummarySchema>) {
  try {
    const validatedData = GetUsageSummarySchema.parse(payload);
    await requireAuth();
    await requireTenant();
    await requirePermission('BILLING', 'READ');
    
    const result = await usageService.getUsageSummary(validatedData.type);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal error' };
  }
}
