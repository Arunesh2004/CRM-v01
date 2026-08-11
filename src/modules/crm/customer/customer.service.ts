import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { CreateCustomerInput, UpdateCustomerInput } from '../crm.types';
import { FeatureAccessService } from '../../billing/feature-access.service';

export async function createCustomer(input: CreateCustomerInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'CREATE');

  await FeatureAccessService.enforceLimit(tenantId, 'MAX_CUSTOMERS');

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

import { QueryParams, PaginatedResponse } from '../../core/types';

export async function getCustomers(params?: QueryParams): Promise<PaginatedResponse<any>> {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'READ');

  const prisma = withTenant(tenantId);
  const limit = params?.limit || 50;
  
  const where: any = { deletedAt: null, tenantId };
  
  if (params?.search) {
    where.name = { contains: params.search, mode: 'insensitive' };
  }
  
  if (params?.filters) {
    if (params.filters.industry) where.industry = params.filters.industry;
    if (params.filters.status) where.status = params.filters.status;
  }

  const customers = await prisma.customer.findMany({
    where,
    take: limit + 1,
    ...(params?.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    orderBy: {
      [params?.sortBy || 'createdAt']: params?.sortOrder || 'desc'
    }
  });

  const hasMore = customers.length > limit;
  const data = hasMore ? customers.slice(0, -1) : customers;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return {
    data,
    pagination: {
      nextCursor,
      hasMore
    }
  };
}

export async function getCustomerById(id: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'READ');

  const prisma = withTenant(tenantId);
  
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      locations: { where: { deletedAt: null } },
      contacts: { where: { deletedAt: null } },
      tasks: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      emailThreads: { orderBy: { createdAt: 'desc' } },
      conversations: { orderBy: { createdAt: 'desc' }, include: { messages: true } },
      assignedUser: { select: { id: true, email: true } }
    }
  });

  if (!customer) return null;

  const activities = await prisma.activityTimeline.findMany({
    where: { tenantId, entityType: 'CUSTOMER', entityId: id },
    orderBy: { createdAt: 'desc' },
    include: { actor: { select: { id: true, email: true } } }
  });

  // Attempt to find related leads by company or exact name
  const relatedLeads = await prisma.lead.findMany({
    where: { tenantId, deletedAt: null, OR: [{ company: customer.name }, { email: { in: customer.contacts.map(c => c.email).filter(Boolean) as string[] } }] }
  });

  return { ...customer, activities, relatedLeads };
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

export async function createContact(input: any) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'UPDATE');

  const prisma = withTenant(tenantId);
  return await prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.customerContact.updateMany({
        where: { customerId: input.customerId, tenantId },
        data: { isPrimary: false }
      });
    }

    const contact = await tx.customerContact.create({
      data: {
        customerId: input.customerId,
        tenantId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        isPrimary: input.isPrimary,
      }
    });

    await tx.activityTimeline.create({
      data: {
        tenantId,
        type: 'SYSTEM',
        content: `Contact added: ${input.firstName} ${input.lastName}`,
        actorId: user.id,
        entityType: 'CUSTOMER',
        entityId: input.customerId
      }
    });

    return contact;
  });
}

export async function createLocation(input: any) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'UPDATE');

  const prisma = withTenant(tenantId);
  return await prisma.$transaction(async (tx) => {

    const location = await tx.location.create({
      data: {
        customerId: input.customerId,
        tenantId,
        name: input.name,
        address: input.address,
        city: input.city,
        state: input.state,
        zip: input.postalCode,
      }
    });

    await tx.activityTimeline.create({
      data: {
        tenantId,
        type: 'SYSTEM',
        content: `Location added: ${input.name}`,
        actorId: user.id,
        entityType: 'CUSTOMER',
        entityId: input.customerId
      }
    });

    return location;
  });
}
