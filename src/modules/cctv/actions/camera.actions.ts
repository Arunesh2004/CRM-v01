'use server'
import { withServerActionContext } from '@/lib/observability/server-action';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';

import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { CreateCameraSchema, UpdateCameraSchema, SimulateAIEventSchema, SetCameraCredentialsSchema, ClearCameraCredentialsSchema } from '../validators/camera.schema';
import * as cameraService from '../camera.service';
import { z } from 'zod';

async function _createCameraAction(payload: z.infer<typeof CreateCameraSchema>) {
  try {
    const validatedData = CreateCameraSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    
    const result = await cameraService.createCamera(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _updateCameraAction(payload: z.infer<typeof UpdateCameraSchema>) {
  try {
    const validatedData = UpdateCameraSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    
    const result = await cameraService.updateCamera(validatedData as any);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _getCamerasAction() {
  try {
    await requireAuth();
    await requireTenant();
    
    const result = await cameraService.getCameras();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _deleteCameraAction(id: string) {
  try {
    await requireAuth();
    await requireTenant();
    
    const result = await cameraService.deleteCamera(id);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _simulateAIEventAction(payload: z.infer<typeof SimulateAIEventSchema>) {
  try {
    const validatedData = SimulateAIEventSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    
    const result = await cameraService.simulateAIEvent(validatedData);
    return { success: true, data: result };
  } catch (error: any) {

    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _setCameraCredentialsAction(payload: z.infer<typeof SetCameraCredentialsSchema>) {
  try {
    const validatedData = SetCameraCredentialsSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    
    const result = await cameraService.setCameraCredentials(validatedData.cameraId, validatedData.rtspUsername, validatedData.rtspPassword);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _clearCameraCredentialsAction(payload: z.infer<typeof ClearCameraCredentialsSchema>) {
  try {
    const validatedData = ClearCameraCredentialsSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    
    const result = await cameraService.clearCameraCredentials(validatedData.cameraId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const createCameraAction = withServerActionContext(_createCameraAction);

export const updateCameraAction = withServerActionContext(_updateCameraAction);

export const getCamerasAction = withServerActionContext(_getCamerasAction);

export const deleteCameraAction = withServerActionContext(_deleteCameraAction);

export const simulateAIEventAction = withServerActionContext(_simulateAIEventAction);

export const setCameraCredentialsAction = withServerActionContext(_setCameraCredentialsAction);

export const clearCameraCredentialsAction = withServerActionContext(_clearCameraCredentialsAction);
