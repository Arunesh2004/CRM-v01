import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { CreateIncidentInput, UpdateIncidentStatusInput, AssignIncidentInput } from './incident.types';

import { assertRelationOwnership } from '@/lib/security/tenant-guard';

export async function createIncident(input: CreateIncidentInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  
  // Incidents might use SYSTEM or CUSTOMER permissions depending on the organization. 
  // Let's use CUSTOMER for now.
  await requirePermission('CUSTOMER', 'UPDATE');

  await assertRelationOwnership([
    { model: 'location', id: input.locationId },
    { model: 'camera', id: input.cameraId },
    { model: 'aIEvent', id: input.aiEventId }
  ], tenantId);

  const prisma = withTenant(tenantId);

  const incident = await prisma.$transaction(async (tx) => {
    // 2. Validate Camera Consistency
    const camera = await tx.camera.findFirst({ where: { id: input.cameraId, tenantId }});
    if (camera && camera.locationId !== input.locationId) throw new Error("Relationship Consistency Error: Camera does not belong to Location");

    // 3. Validate AIEvent Consistency
    const aiEvent = await tx.aIEvent.findFirst({ where: { id: input.aiEventId, tenantId }});
    if (aiEvent && aiEvent.cameraId !== input.cameraId) throw new Error("Relationship Consistency Error: AIEvent does not belong to Camera");

    const location = await tx.location.findFirst({ where: { id: input.locationId, tenantId }});

    const incident = await tx.incident.create({
      data: {
        tenantId,
        locationId: input.locationId,
        cameraId: input.cameraId,
        aiEventId: input.aiEventId,
        title: input.title,
        description: input.description,
        severity: input.severity,
      }
    });

    if (location) {
      await tx.activityTimeline.create({
        data: {
          tenantId,
          type: 'SYSTEM',
          content: `Security Incident Generated: ${input.title} [${input.severity}]`,
          actorId: user.id,
          entityType: 'CUSTOMER',
          entityId: location.customerId
        }
      });
    }

    return incident;
  });

  // Trigger notification asynchronously
  import('../communication/notification.service').then(({ sendIncidentNotification }) => {
    sendIncidentNotification(incident.id, tenantId, user.id).catch(console.error);
  });

  return incident;
}

export async function getIncidents() {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'READ');

  const prisma = withTenant(tenantId);
  return await prisma.incident.findMany({
    where: { tenantId, deletedAt: null },
    include: {
      location: true,
      camera: true,
      assignedUser: { select: { email: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getIncidentById(id: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'READ');

  const prisma = withTenant(tenantId);
  return await prisma.incident.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      location: true,
      camera: true,
      aiEvent: true,
      assignedUser: { select: { email: true } }
    }
  });
}

export async function updateIncidentStatus(input: UpdateIncidentStatusInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'UPDATE');

  const prisma = withTenant(tenantId);

  return await prisma.$transaction(async (tx) => {
    const incident = await tx.incident.findFirst({ where: { id: input.id, tenantId }, include: { location: true } });
    if (!incident) throw new Error('Incident not found');

    const updated = await tx.incident.update({
      where: { id: input.id },
      data: { 
        status: input.status,
        resolvedAt: input.status === 'RESOLVED' ? new Date() : null,
      }
    });

    if (incident.location) {
      await tx.activityTimeline.create({
        data: {
          tenantId,
          type: 'SYSTEM',
          content: `Incident status updated to ${input.status}: ${incident.title}`,
          actorId: user.id,
          entityType: 'CUSTOMER',
          entityId: incident.location.customerId
        }
      });
    }

    return updated;
  });
}

export async function assignIncident(input: AssignIncidentInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'UPDATE');

  const prisma = withTenant(tenantId);

  return await prisma.$transaction(async (tx) => {
    const incident = await tx.incident.findFirst({ where: { id: input.id, tenantId }, include: { location: true } });
    if (!incident) throw new Error('Incident not found');

    if (input.assignedUserId) {
      await assertRelationOwnership([{ model: 'user', id: input.assignedUserId }], tenantId);
    }

    const updated = await tx.incident.update({
      where: { id: input.id },
      data: { assignedUserId: input.assignedUserId }
    });

    if (incident.location) {
      await tx.activityTimeline.create({
        data: {
          tenantId,
          type: 'SYSTEM',
          content: `Incident assigned: ${incident.title}`,
          actorId: user.id,
          entityType: 'CUSTOMER',
          entityId: incident.location.customerId
        }
      });
    }

    return updated;
  });
}

export async function resolveIncident(id: string) {
  return await updateIncidentStatus({ id, status: 'RESOLVED' });
}

export async function deleteIncident(id: string) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'UPDATE');

  const prisma = withTenant(tenantId);

  return await prisma.$transaction(async (tx) => {
    const incident = await tx.incident.findFirst({ where: { id, tenantId, deletedAt: null }, include: { location: true } });
    if (!incident) throw new Error('Incident not found');

    const updated = await tx.incident.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    if (incident.location) {
      await tx.activityTimeline.create({
        data: {
          tenantId,
          type: 'SYSTEM',
          content: `Deleted incident: ${incident.title}`,
          actorId: user.id,
          entityType: 'CUSTOMER',
          entityId: incident.location.customerId
        }
      });
    }

    return { success: true };
  });
}
