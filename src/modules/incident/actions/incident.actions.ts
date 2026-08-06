'use server'

import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { UpdateIncidentStatusSchema, AssignIncidentSchema } from '../validators/incident.schema';
import * as incidentService from '../incident.service';
import { z } from 'zod';

export async function getIncidentsAction() {
  try {
    await requireAuth();
    await requireTenant();
    
    const result = await incidentService.getIncidents();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateIncidentStatusAction(payload: z.infer<typeof UpdateIncidentStatusSchema>) {
  try {
    const validatedData = UpdateIncidentStatusSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    
    const result = await incidentService.updateIncidentStatus(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignIncidentAction(payload: z.infer<typeof AssignIncidentSchema>) {
  try {
    const validatedData = AssignIncidentSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    
    const result = await incidentService.assignIncident(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function resolveIncidentAction(id: string) {
  try {
    await requireAuth();
    await requireTenant();
    
    const result = await incidentService.resolveIncident(id);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
