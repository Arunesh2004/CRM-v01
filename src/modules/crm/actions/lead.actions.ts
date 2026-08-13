'use server'
import { sanitizeClientError } from '@/lib/errors/client-safe-error';

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
    return { success: false, error: sanitizeClientError(error) };
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
    return { success: false, error: sanitizeClientError(error) };
  }
}

import { QueryParams } from '../../core/types';

export async function getLeadsAction(params?: QueryParams) {
  try {
    await requireAuth();
    await requireTenant();
    await requirePermission('LEAD', 'READ');
    
    const result = await leadService.getLeads(params);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function assignLeadAction(leadId: string, assignedUserId: string) {
  try {
    await requireAuth();
    await requireTenant();
    await requirePermission('LEAD', 'UPDATE');
    
    // updateLead handles assignment timeline and audit logs if assignedUserId changes
    const result = await leadService.updateLead({ id: leadId, assignedUserId });
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function convertLeadAction(leadId: string) {
  try {
    await requireAuth();
    await requireTenant();
    await requirePermission('LEAD', 'UPDATE');
    
    const result = await leadService.convertLeadToCustomer(leadId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function deleteLeadAction(leadId: string) {
  try {
    await requireAuth();
    await requireTenant();
    await requirePermission('LEAD', 'DELETE');
    
    const result = await leadService.deleteLead(leadId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
