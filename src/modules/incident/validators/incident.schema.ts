import { z } from 'zod';
import { IncidentStatus, IncidentSeverity } from '@prisma/client';

export const CreateIncidentSchema = z.object({
  locationId: z.string().min(1, 'Location is required'),
  cameraId: z.string().min(1, 'Camera is required'),
  aiEventId: z.string().min(1, 'AI Event is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  severity: z.nativeEnum(IncidentSeverity),
});

export const UpdateIncidentStatusSchema = z.object({
  id: z.string().min(1, 'Incident ID is required'),
  status: z.nativeEnum(IncidentStatus),
});

export const AssignIncidentSchema = z.object({
  id: z.string().min(1, 'Incident ID is required'),
  assignedUserId: z.string().min(1, 'User ID is required'),
});
