import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { CreateCustomerInput, UpdateCustomerInput } from '../crm.types';

export async function createCustomer(input: CreateCustomerInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'CREATE');

  const prisma = withTenant(tenantId);

  // BUG-CRM-SEC-001 Case Insensitive Customer Duplicate Prevention
  const normalizedName = input.name.toLowerCase().trim().replace(/\s+/g, ' ');
  const existing = await prisma.customer.findFirst({ where: { tenantId, normalizedName } });
  if (existing) throw new Error('A customer with this name already exists.');

  return await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        name: input.name,
        normalizedName,
        industry: input.industry,
        assignedUserId: input.assignedUserId,
        tenantId
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'CUSTOMER_CREATED',
        resource: 'CUSTOMER',
        resourceId: customer.id,
      }
    });

    await tx.activityTimeline.create({
      data: {
        tenantId,
        type: 'SYSTEM',
        content: `Customer created: ${customer.name}`,
        actorId: user.id,
        entityType: 'CUSTOMER',
        entityId: customer.id
      }
    });

    return customer;
  });
}

export async function getCustomers() {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'READ');

  const prisma = withTenant(tenantId);
  return await prisma.customer.findMany({
    where: { deletedAt: null }
  });
}

export async function getCustomerById(id: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'READ');

  const prisma = withTenant(tenantId);
  return await prisma.customer.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      locations: true,
      contacts: true
    }
  });
}

export async function updateCustomer(input: UpdateCustomerInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'UPDATE');

  const prisma = withTenant(tenantId);

  return await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findFirst({ where: { id: input.id, tenantId }});
    if (!customer) throw new Error('Customer not found');

    let assignmentChanged = false;
    if (input.assignedUserId && input.assignedUserId !== customer.assignedUserId) {
      assignmentChanged = true;
    }

    await tx.customer.updateMany({
      where: { id: input.id, tenantId },
      data: {
        name: input.name,
        industry: input.industry,
        status: input.status,
        assignedUserId: input.assignedUserId,
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'CUSTOMER_UPDATED',
        resource: 'CUSTOMER',
        resourceId: input.id,
      }
    });

    await tx.activityTimeline.create({
      data: {
        tenantId,
        type: 'SYSTEM',
        content: `Customer updated`,
        actorId: user.id,
        entityType: 'CUSTOMER',
        entityId: input.id
      }
    });

    if (assignmentChanged) {
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: user.id,
          actorType: 'USER',
          action: 'CUSTOMER_ASSIGNMENT_CHANGED',
          resource: 'CUSTOMER',
          resourceId: input.id,
          metadata: { newAssignedUserId: input.assignedUserId }
        }
      });

      await tx.activityTimeline.create({
        data: {
          tenantId,
          type: 'SYSTEM',
          content: `Customer assigned to user ID: ${input.assignedUserId}`,
          actorId: user.id,
          entityType: 'CUSTOMER',
          entityId: input.id
        }
      });
    }

    return tx.customer.findFirst({ where: { id: input.id, tenantId }});
  });
}

export async function deleteCustomer(customerId: string) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'DELETE');

  const prisma = withTenant(tenantId);

  return await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findFirst({ where: { id: customerId, tenantId, deletedAt: null } });
    if (!customer) throw new Error('Customer not found');

    await tx.customer.update({
      where: { id: customerId },
      data: { deletedAt: new Date() }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'CUSTOMER_DELETED',
        resource: 'CUSTOMER',
        resourceId: customerId,
      }
    });

    return { success: true };
  });
}
