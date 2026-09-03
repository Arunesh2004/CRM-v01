import { CameraProtocol, CameraStatus, CameraAuthMode } from '@prisma/client';

export type CreateCameraInput = {
  name: string;
  locationId: string;
  ipAddress: string;
  protocol: CameraProtocol;
  authMode: CameraAuthMode;
  model?: string;
  manufacturer?: string;
  rtspUsername?: string;
  rtspPassword?: string;
};

export type UpdateCameraInput = Partial<Omit<CreateCameraInput, 'rtspUsername' | 'rtspPassword'>> & {
  id: string;
  status?: CameraStatus;
};

export type SimulateAIEventInput = {
  cameraId: string;
  detectedObject: string;
  confidence: number;
};
