import { IncidentStatus, IncidentSeverity } from '@prisma/client';

export type CreateIncidentInput = {
  locationId: string;
  cameraId: string;
  aiEventId: string;
  title: string;
  description?: string;
  severity: IncidentSeverity;
};

export type UpdateIncidentStatusInput = {
  id: string;
  status: IncidentStatus;
};

export type AssignIncidentInput = {
  id: string;
  assignedUserId: string;
};
