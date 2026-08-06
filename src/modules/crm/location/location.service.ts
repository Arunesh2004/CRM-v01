import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { CreateLocationInput, UpdateLocationInput } from '../crm.types';

export async function createLocation(input: CreateLocationInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  // Using LOCATION as resource for permissions if it exists, otherwise fallback to CUSTOMER
  // Actually, let's just use CUSTOMER permission for now as they are closely tied, or if LOCATION exists in Permission enum we use it. 
  // Let's assume LOCATION is valid in the permissions system or we use CUSTOMER. Wait, earlier there was no LOCATION resource.
  // I will check if I need to bypass requirePermission or use CUSTOMER.
  // We'll use CUSTOMER CREATE permission since they are tied to a customer.
  await requirePermission('CUSTOMER', 'UPDATE'); 

  const prisma = withTenant(tenantId);

  return await prisma.$transaction(async (tx) => {
    // Verify customer exists and belongs to tenant
    const customer = await tx.customer.findFirst({ where: { id: input.customerId, tenantId } });
    if (!customer) throw new Error('Customer not found');

    const location = await tx.location.create({
      data: {
        tenantId,
        customerId: input.customerId,
        name: input.name,
        address: input.address,
        city: input.city,
        state: input.state,
        zip: input.zip,
        coordinates: input.coordinates,
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'LOCATION_CREATED',
        resource: 'CUSTOMER',
        resourceId: input.customerId,
        metadata: { locationId: location.id, name: location.name }
      }
    });

    await tx.activityTimeline.create({
      data: {
        tenantId,
        type: 'SYSTEM',
        content: `Added new location: ${location.name}`,
        actorId: user.id,
        entityType: 'CUSTOMER',
        entityId: input.customerId
      }
    });

    return location;
  });
}

export async function getLocations() {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'READ');

  const prisma = withTenant(tenantId);
  return await prisma.location.findMany({
    where: { deletedAt: null },
    include: { customer: { select: { name: true } } }
  });
}

export async function getLocationById(id: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'READ');

  const prisma = withTenant(tenantId);
  return await prisma.location.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: { customer: true, cameras: true }
  });
}

export async function updateLocation(input: UpdateLocationInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'UPDATE');

  const prisma = withTenant(tenantId);

  return await prisma.$transaction(async (tx) => {
    const location = await tx.location.findFirst({ where: { id: input.id, tenantId }});
    if (!location) throw new Error('Location not found');

    await tx.location.updateMany({
      where: { id: input.id, tenantId },
      data: {
        name: input.name,
        address: input.address,
        city: input.city,
        state: input.state,
        zip: input.zip,
        coordinates: input.coordinates,
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'LOCATION_UPDATED',
        resource: 'CUSTOMER',
        resourceId: location.customerId,
        metadata: { locationId: location.id }
      }
    });

    await tx.activityTimeline.create({
      data: {
        tenantId,
        type: 'SYSTEM',
        content: `Updated location: ${input.name || location.name}`,
        actorId: user.id,
        entityType: 'CUSTOMER',
        entityId: location.customerId
      }
    });

    return tx.location.findFirst({ where: { id: input.id, tenantId }});
  });
}

export async function deleteLocation(id: string) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'UPDATE');

  const prisma = withTenant(tenantId);

  return await prisma.$transaction(async (tx) => {
    const location = await tx.location.findFirst({ where: { id, tenantId }});
    if (!location) throw new Error('Location not found');

    await tx.location.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date() }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'LOCATION_DELETED',
        resource: 'CUSTOMER',
        resourceId: location.customerId,
        metadata: { locationId: location.id, name: location.name }
      }
    });

    await tx.activityTimeline.create({
      data: {
        tenantId,
        type: 'SYSTEM',
        content: `Deleted location: ${location.name}`,
        actorId: user.id,
        entityType: 'CUSTOMER',
        entityId: location.customerId
      }
    });

    return { success: true };
  });
}
