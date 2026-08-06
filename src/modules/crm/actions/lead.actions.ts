'use server'

import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { CreateLeadSchema, UpdateLeadSchema } from '../validators/lead.schema';
import * as leadService from '../lead/lead.service';
import { z } from 'zod';

export async function createLeadAction(payload: z.infer<typeof CreateLeadSchema>) {
  try {
    const validatedData = CreateLeadSchema.parse(payload);
    
    // Boundary Security Checks
    await requireAuth();
    await requireTenant();
    await requirePermission('LEAD', 'CREATE');
    
    const result = await leadService.createLead(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateLeadAction(payload: z.infer<typeof UpdateLeadSchema>) {
  try {
    const validatedData = UpdateLeadSchema.parse(payload);
    
    await requireAuth();
    await requireTenant();
    await requirePermission('LEAD', 'UPDATE');
    
    const result = await leadService.updateLead(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getLeadsAction() {
  try {
    await requireAuth();
    await requireTenant();
    await requirePermission('LEAD', 'READ');
    
    const result = await leadService.getLeads();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
