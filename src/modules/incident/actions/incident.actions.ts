'use server'
import { withServerActionContext } from '@/lib/observability/server-action';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import * as incidentService from '../incident.service';
import { z } from 'zod';
import { IncidentStatus, IncidentSeverity } from '@prisma/client';
import { Logger } from '@/lib/logger/logger';

const CreateIncidentSchema = z.object({
  locationId: z.string().uuid(),
  cameraId: z.string().uuid(),
  aiEventId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  severity: z.nativeEnum(IncidentSeverity)
}).strip();

const UpdateIncidentStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.nativeEnum(IncidentStatus)
}).strip();

const AssignIncidentSchema = z.object({
  id: z.string().uuid(),
  assignedUserId: z.string().uuid()
}).strip();


 
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
async function _createIncidentAction(data: any) {
  try {
    const { idempotencyKey, ...incidentData } = data;
    const validated = CreateIncidentSchema.parse(incidentData);
    
    const result = await incidentService.createIncident({ ...validated, idempotencyKey });
    return { success: true, data: result };
  } catch (error: unknown) {
    Logger.error('createIncidentAction failed', error instanceof Error ? error : new Error(String(error)));
    return { success: false, error: sanitizeClientError(error) };
  }
}


async function _getIncidentsAction() {
  try {
    const result = await incidentService.getIncidents();
    return { success: true, data: result };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _getIncidentByIdAction(id: string) {
  try {
    const result = await incidentService.getIncidentById(id);
    return { success: true, data: result };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}
 

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
async function _updateIncidentStatusAction(payload: any) {
  try {
    const validated = UpdateIncidentStatusSchema.parse(payload);
    const result = await incidentService.updateIncidentStatus(validated);
    return { success: true, data: result };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
 
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
async function _assignIncidentAction(payload: any) {
  try {
    const validated = AssignIncidentSchema.parse(payload);
    const result = await incidentService.assignIncident(validated);
    return { success: true, data: result };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _resolveIncidentAction(id: string) {
  try {
    const result = await incidentService.resolveIncident(id);
    return { success: true, data: result };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _deleteIncidentAction(id: string) {
  try {
    const result = await incidentService.deleteIncident(id);
    return { success: true, data: result };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const createIncidentAction = withServerActionContext(_createIncidentAction);

export const getIncidentsAction = withServerActionContext(_getIncidentsAction);

export const getIncidentByIdAction = withServerActionContext(_getIncidentByIdAction);

export const updateIncidentStatusAction = withServerActionContext(_updateIncidentStatusAction);

export const assignIncidentAction = withServerActionContext(_assignIncidentAction);

export const resolveIncidentAction = withServerActionContext(_resolveIncidentAction);

export const deleteIncidentAction = withServerActionContext(_deleteIncidentAction);
