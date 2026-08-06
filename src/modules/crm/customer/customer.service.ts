import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { CreateCustomerInput, UpdateCustomerInput } from '../crm.types';

export async function createCustomer(input: CreateCustomerInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'CREATE');

  const prisma = withTenant(tenantId);

  return await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        name: input.name,
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
    }

    return tx.customer.findFirst({ where: { id: input.id, tenantId }});
  });
}
