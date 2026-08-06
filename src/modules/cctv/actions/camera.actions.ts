'use server'

import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { CreateCameraSchema, UpdateCameraSchema, SimulateAIEventSchema } from '../validators/camera.schema';
import * as cameraService from '../camera.service';
import { z } from 'zod';

export async function createCameraAction(payload: z.infer<typeof CreateCameraSchema>) {
  try {
    const validatedData = CreateCameraSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    
    const result = await cameraService.createCamera(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCameraAction(payload: z.infer<typeof UpdateCameraSchema>) {
  try {
    const validatedData = UpdateCameraSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    
    const result = await cameraService.updateCamera(validatedData as any);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCamerasAction() {
  try {
    await requireAuth();
    await requireTenant();
    
    const result = await cameraService.getCameras();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteCameraAction(id: string) {
  try {
    await requireAuth();
    await requireTenant();
    
    const result = await cameraService.deleteCamera(id);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function simulateAIEventAction(payload: z.infer<typeof SimulateAIEventSchema>) {
  try {
    const validatedData = SimulateAIEventSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    
    const result = await cameraService.simulateAIEvent(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
