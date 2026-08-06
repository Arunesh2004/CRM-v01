import { z } from 'zod';
import { CameraProtocol, CameraStatus } from '@prisma/client';

export const CreateCameraSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  locationId: z.string().min(1, 'Location is required'),
  ipAddress: z.string().min(1, 'IP Address is required'),
  protocol: z.nativeEnum(CameraProtocol),
  model: z.string().optional(),
  manufacturer: z.string().optional(),
});

export const UpdateCameraSchema = CreateCameraSchema.partial().extend({
  id: z.string().min(1, 'Camera ID is required'),
  status: z.nativeEnum(CameraStatus).optional(),
});

export const SimulateAIEventSchema = z.object({
  cameraId: z.string().min(1, 'Camera is required'),
  detectedObject: z.string().min(1, 'Detected object is required'),
  confidence: z.number().min(0).max(100),
});
