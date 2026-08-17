'use server'
import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import * as incidentService from '../incident.service';

export async function createIncidentAction(payload: any) {
  try {
    const result = await incidentService.createIncident(payload);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function getIncidentsAction() {
  try {
    const result = await incidentService.getIncidents();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function getIncidentByIdAction(id: string) {
  try {
    const result = await incidentService.getIncidentById(id);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function updateIncidentStatusAction(payload: any) {
  try {
    const result = await incidentService.updateIncidentStatus(payload);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function assignIncidentAction(payload: any) {
  try {
    const result = await incidentService.assignIncident(payload);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function resolveIncidentAction(id: string) {
  try {
    const result = await incidentService.resolveIncident(id);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function deleteIncidentAction(id: string) {
  try {
    const result = await incidentService.deleteIncident(id);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
