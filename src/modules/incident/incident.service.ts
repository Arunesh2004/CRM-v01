import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { CreateIncidentInput, UpdateIncidentStatusInput, AssignIncidentInput } from './incident.types';

export async function createIncident(input: CreateIncidentInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  
  // Incidents might use SYSTEM or CUSTOMER permissions depending on the organization. 
  // Let's use CUSTOMER for now.
  await requirePermission('CUSTOMER', 'UPDATE');

  const prisma = withTenant(tenantId);

  return await prisma.$transaction(async (tx) => {
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

    const location = await tx.location.findFirst({ where: { id: input.locationId, tenantId }});

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
}

export async function getIncidents() {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'READ');

  const prisma = withTenant(tenantId);
  return await prisma.incident.findMany({
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
    where: { id, tenantId },
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
