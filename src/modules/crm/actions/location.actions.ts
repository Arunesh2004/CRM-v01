'use server'
import { withServerActionContext } from '@/lib/observability/server-action';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';

import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { CreateLocationSchema, UpdateLocationSchema } from '../validators/location.schema';
import * as locationService from '../location/location.service';
import { z } from 'zod';

async function _createLocationAction(payload: z.infer<typeof CreateLocationSchema>) {
  try {
    const validatedData = CreateLocationSchema.parse(payload);
    
    await requireAuth();
    await requireTenant();
    await requirePermission('CUSTOMER', 'UPDATE');
    
    const result = await locationService.createLocation(validatedData);
    return { success: true, data: result };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _updateLocationAction(payload: z.infer<typeof UpdateLocationSchema>) {
  try {
    const validatedData = UpdateLocationSchema.parse(payload);
    
    await requireAuth();
    await requireTenant();
    await requirePermission('CUSTOMER', 'UPDATE');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    const result = await locationService.updateLocation(validatedData as any);
    return { success: true, data: result };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _getLocationsAction() {
  try {
    await requireAuth();
    await requireTenant();
    await requirePermission('CUSTOMER', 'READ');
    
    const result = await locationService.getLocations();
    return { success: true, data: result };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _deleteLocationAction(id: string) {
  try {
    await requireAuth();
    await requireTenant();
    await requirePermission('CUSTOMER', 'UPDATE');
    
    const result = await locationService.deleteLocation(id);
    return { success: true, data: result };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const createLocationAction = withServerActionContext(_createLocationAction);

export const updateLocationAction = withServerActionContext(_updateLocationAction);

export const getLocationsAction = withServerActionContext(_getLocationsAction);

export const deleteLocationAction = withServerActionContext(_deleteLocationAction);
