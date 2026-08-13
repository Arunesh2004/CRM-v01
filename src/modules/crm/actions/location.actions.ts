import { sanitizeClientError } from '@/lib/errors/client-safe-error';
'use server'

import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { CreateLocationSchema, UpdateLocationSchema } from '../validators/location.schema';
import * as locationService from '../location/location.service';
import { z } from 'zod';

export async function createLocationAction(payload: z.infer<typeof CreateLocationSchema>) {
  try {
    const validatedData = CreateLocationSchema.parse(payload);
    
    await requireAuth();
    await requireTenant();
    await requirePermission('CUSTOMER', 'UPDATE');
    
    const result = await locationService.createLocation(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function updateLocationAction(payload: z.infer<typeof UpdateLocationSchema>) {
  try {
    const validatedData = UpdateLocationSchema.parse(payload);
    
    await requireAuth();
    await requireTenant();
    await requirePermission('CUSTOMER', 'UPDATE');
    
    const result = await locationService.updateLocation(validatedData as any);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function getLocationsAction() {
  try {
    await requireAuth();
    await requireTenant();
    await requirePermission('CUSTOMER', 'READ');
    
    const result = await locationService.getLocations();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function deleteLocationAction(id: string) {
  try {
    await requireAuth();
    await requireTenant();
    await requirePermission('CUSTOMER', 'UPDATE');
    
    const result = await locationService.deleteLocation(id);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
