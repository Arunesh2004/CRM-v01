import { z } from 'zod';
import { CameraProtocol, CameraStatus, CameraAuthMode } from '@prisma/client';

export const CreateCameraSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  locationId: z.string().min(1, 'Location is required'),
  ipAddress: z.string().min(1, 'IP Address is required'),
  protocol: z.nativeEnum(CameraProtocol),
  authMode: z.nativeEnum(CameraAuthMode),
  model: z.string().optional(),
  manufacturer: z.string().optional(),
  rtspUsername: z.string().optional(),
  rtspPassword: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.rtspUsername && !data.rtspPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password is required if username is provided',
      path: ['rtspPassword'],
    });
  }
  if (!data.rtspUsername && data.rtspPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Username is required if password is provided',
      path: ['rtspUsername'],
    });
  }
  if (data.authMode === 'NONE' && (data.rtspUsername || data.rtspPassword)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Credentials must not be provided when authentication mode is NONE',
      path: ['authMode'],
    });
  }
});

export const UpdateCameraSchema = z.object({
  id: z.string().min(1, 'Camera ID is required'),
  name: z.string().min(1, 'Name is required').optional(),
  locationId: z.string().min(1, 'Location is required').optional(),
  ipAddress: z.string().min(1, 'IP Address is required').optional(),
  protocol: z.nativeEnum(CameraProtocol).optional(),
  authMode: z.nativeEnum(CameraAuthMode).optional(),
  model: z.string().optional(),
  manufacturer: z.string().optional(),
  status: z.nativeEnum(CameraStatus).optional(),
});

export const SetCameraCredentialsSchema = z.object({
  cameraId: z.string().min(1, 'Camera ID is required'),
  rtspUsername: z.string().min(1, 'Username is required'),
  rtspPassword: z.string().min(1, 'Password is required'),
});

export const ClearCameraCredentialsSchema = z.object({
  cameraId: z.string().min(1, 'Camera ID is required'),
});

export const SimulateAIEventSchema = z.object({
  cameraId: z.string().min(1, 'Camera is required'),
  detectedObject: z.string().min(1, 'Detected object is required'),
  confidence: z.number().min(0).max(100),
});
