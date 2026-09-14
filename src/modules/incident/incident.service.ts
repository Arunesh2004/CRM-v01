import { Prisma, IncidentStatus, IncidentSeverity } from '@prisma/client';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import { CreateIncidentInput, UpdateIncidentStatusInput, AssignIncidentInput } from './incident.types';
import { Logger } from '@/lib/logger/logger';
import { requireRelationOwnership } from '@/lib/auth/relation-auth';
import globalPrisma from '@db/utils/prisma';
import { withIdempotency, IdempotencyOperations } from '@/lib/idempotency';
import * as incidentService from './incident.service';


 
 
export async function createIncident(input: CreateIncidentInput & { idempotencyKey?: string, explicitTenantId?: string, explicitUserId?: string }, externalTx?: Prisma.TransactionClient) {
  const user = input.explicitUserId ? { id: input.explicitUserId } : await requireAuth();
  const tenantId = input.explicitTenantId || await requireTenant();
  
  // Incidents might use SYSTEM or CUSTOMER permissions depending on the organization. 
  // Let's use CUSTOMER for now. (Check fast if explicit user)
  if (input.explicitUserId) {
    const { checkPermissionFast } = await import('@/lib/auth');
    const hasPerm = await checkPermissionFast(input.explicitUserId, 'INCIDENT', 'CREATE');
    if (!hasPerm) throw new Error('Forbidden: Requires CREATE on INCIDENT');
  } else {
    await requirePermission('INCIDENT', 'CREATE');
  }
 
 

   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional unused destructuring exclusion
  const { idempotencyKey, explicitTenantId, explicitUserId, ...incidentData } = input;

   
  const runTx = async (baseTx: Prisma.TransactionClient) => {
    const tx = await withTenantTransaction(baseTx, tenantId);

    await requireRelationOwnership(tx, tenantId, {
      location: incidentData.locationId,
      camera: incidentData.cameraId,
      aIEvent: incidentData.aiEventId
    });
    // 2. Validate Camera Consistency
    const camera = await tx.camera.findFirst({ where: { id: incidentData.cameraId, tenantId }});
    if (camera && camera.locationId !== incidentData.locationId) throw new Error("Relationship Consistency Error: Camera does not belong to Location");

    // 3. Validate AIEvent Consistency
    const aiEvent = await tx.aIEvent.findFirst({ where: { id: incidentData.aiEventId, tenantId }});
    if (aiEvent && aiEvent.cameraId !== incidentData.cameraId) throw new Error("Relationship Consistency Error: AIEvent does not belong to Camera");

    const location = await tx.location.findFirst({ where: { id: incidentData.locationId, tenantId }});

    const incident = await tx.incident.create({
      data: {
        tenantId,
        locationId: incidentData.locationId,
        cameraId: incidentData.cameraId,
        aiEventId: incidentData.aiEventId,
        title: incidentData.title,
        description: incidentData.description,
        severity: incidentData.severity,
      }
    });

    if (location) {
      await tx.activityTimeline.create({
        data: {
          tenantId,
          type: 'SYSTEM',
          content: `Security Incident Generated: ${incidentData.title} [${incidentData.severity}]`,
          actorId: user.id,
          entityType: 'CUSTOMER',
          entityId: location.customerId
        }
      });
    }

    return incident;
  };

  let incident;
  if (idempotencyKey && !externalTx) {
    incident = await withIdempotency(
      tenantId,
      user.id,
      IdempotencyOperations.CREATE_INCIDENT,
       
      idempotencyKey,
      incidentData,
      runTx,
      async (tId, uId, rId) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
        return await incidentService.getIncidentById(rId) as any;
      }
    );
  } else {
    incident = externalTx ? await runTx(externalTx) : await globalPrisma.$transaction(runTx);
  }


  // Trigger notification asynchronously
  import('../communication/notification.service').then(({ NotificationService }) => {
    NotificationService.createNotification(tenantId, user.id, 'ALERT', `Incident Generated: ${incident.title}`, incident.description || 'New security incident requires attention').catch((err: unknown) => Logger.error('Failed to send incident notification', err instanceof Error ? err : new Error(String(err))));
  });

  return incident;
}

export async function getIncidents(filters?: { status?: string, severity?: string }) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'READ');

  const prisma = withTenant(tenantId);
  
  const whereClause: Prisma.IncidentWhereInput = { tenantId, deletedAt: null };
  if (filters?.status && Object.values(IncidentStatus).includes(filters.status as IncidentStatus)) {
    whereClause.status = filters.status as IncidentStatus;
  }
  if (filters?.severity && Object.values(IncidentSeverity).includes(filters.severity as IncidentSeverity)) {
    whereClause.severity = filters.severity as IncidentSeverity;
  }

  return await prisma.incident.findMany({
    where: whereClause,
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  const prisma = withTenant(tenantId);

   
  return await globalPrisma.$transaction(async (baseTx) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    const incident = await tx.incident.findFirst({ where: { id: input.id, tenantId }, include: { location: true } });
    if (!incident) throw new Error('Incident not found');

    const validTransitions: Record<string, string[]> = {
      'OPEN': ['ACKNOWLEDGED'],
      'ACKNOWLEDGED': ['INVESTIGATING'],
      'INVESTIGATING': ['RESOLVED'],
      'RESOLVED': ['CLOSED'],
      'CLOSED': []
    };

    if (!validTransitions[incident.status].includes(input.status)) {
      throw new Error(`Invalid status transition from ${incident.status} to ${input.status}`);
    }

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  const prisma = withTenant(tenantId);

   
  return await globalPrisma.$transaction(async (baseTx) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    const incident = await tx.incident.findFirst({ where: { id: input.id, tenantId }, include: { location: true } });
    if (!incident) throw new Error('Incident not found');

    if (input.assignedUserId) {
      await requireRelationOwnership(tx, tenantId, { user: input.assignedUserId });
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  const prisma = withTenant(tenantId);

   
  return await globalPrisma.$transaction(async (baseTx) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    const incident = await tx.incident.findFirst({ where: { id, tenantId, deletedAt: null }, include: { location: true } });
    if (!incident) throw new Error('Incident not found');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
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
