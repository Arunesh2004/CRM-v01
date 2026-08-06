import { CameraProtocol, CameraStatus } from '@prisma/client';

export type CreateCameraInput = {
  name: string;
  locationId: string;
  ipAddress: string;
  protocol: CameraProtocol;
  model?: string;
  manufacturer?: string;
};

export type UpdateCameraInput = Partial<CreateCameraInput> & {
  id: string;
  status?: CameraStatus;
};

export type SimulateAIEventInput = {
  cameraId: string;
  detectedObject: string;
  confidence: number;
};
