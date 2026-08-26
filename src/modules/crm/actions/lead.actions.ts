'use server'
import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { revalidatePath } from 'next/cache';

import { CreateLeadSchema, UpdateLeadSchema } from '../validators/lead.schema';
import * as leadService from '../lead/lead.service';
import { z } from 'zod';
import { LeadStatus } from '@prisma/client';

// ──────────────────────────────────────────────────────────────────────────────
// KANBAN STAGE TRANSITION ACTION
// ──────────────────────────────────────────────────────────────────────────────
// Purpose-built action for drag-and-drop stage persistence.
// Only accepts `id` + `status`. The service layer enforces:
//   1. Authentication   — requireAuth()
//   2. Tenant binding   — requireTenant() (never trusts client tenantId)
//   3. LEAD UPDATE perm — requirePermission('LEAD', 'UPDATE')
//   4. Ownership verify — tx.lead.findFirst({ where: { id, tenantId } })
//   5. Status allowlist — LeadStatus enum from Prisma client
// Adversarial note: an attacker cannot inject tenantId or move another
// tenant's lead — the service resolves tenantId from the session cookie.
const KanbanStageSchema = z.object({
  id:     z.string().uuid('Invalid lead ID'),
  status: z.nativeEnum(LeadStatus, { error: () => ({ message: 'Invalid pipeline stage' }) }),
});

export async function updateLeadStatusAction(payload: { id: string; status: string }) {
  try {
    const { id, status } = KanbanStageSchema.parse(payload);
    // updateLead already enforces auth + tenant + permission + ownership internally
    const result = await leadService.updateLead({ id, status });
    revalidatePath('/leads');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function createLeadAction(payload: z.infer<typeof CreateLeadSchema>) {
  try {
    const validatedData = CreateLeadSchema.parse(payload);
    
    // Boundary Security Checks are handled in leadService
    
    const result = await leadService.createLead(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function updateLeadAction(payload: z.infer<typeof UpdateLeadSchema>) {
  try {
    const validatedData = UpdateLeadSchema.parse(payload);
    
    const result = await leadService.updateLead(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

import { QueryParams } from '../../core/types';

export async function getLeadsAction(params?: QueryParams) {
  try {
    const result = await leadService.getLeads(params);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function assignLeadAction(leadId: string, assignedUserId: string) {
  try {
    // updateLead handles assignment timeline and audit logs if assignedUserId changes
    const result = await leadService.updateLead({ id: leadId, assignedUserId });
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function convertLeadAction(leadId: string) {
  try {
    const result = await leadService.convertLeadToCustomer(leadId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function deleteLeadAction(leadId: string) {
  try {
    const result = await leadService.deleteLead(leadId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
