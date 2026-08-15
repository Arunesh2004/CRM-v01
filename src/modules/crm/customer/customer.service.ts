import { requireAuth, requireTenant, requirePermission, requireAuthIdentity, requirePermissionFast, requireTenantFromIdentity } from '@/lib/auth';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { CreateCustomerInput, UpdateCustomerInput } from '../crm.types';
import { FeatureAccessService } from '../../billing/feature-access.service';
import { createTenantCustomerFast } from '@/../database/utils/fast-tenant-queries';

export async function createCustomer(input: CreateCustomerInput) {
  const startTotal = performance.now();
  
  const startAuth = performance.now();
  const identity = await requireAuthIdentity();
  const authMs = performance.now() - startAuth;
  
  const startTenant = performance.now();
  const tenantId = await requireTenantFromIdentity(identity);
  const tenantMs = performance.now() - startTenant;
  
  const startPerm = performance.now();
  await requirePermissionFast(identity.id, 'CUSTOMER', 'CREATE');
  const permissionMs = performance.now() - startPerm;
  
  const startSub = performance.now();
  await FeatureAccessService.enforceCustomerLimitFast(tenantId);
  const subscriptionMs = performance.now() - startSub;
  
  const startDup = performance.now();
  const normalizedName = input.name.toLowerCase().trim().replace(/\s+/g, ' ');
  const prismaModule = await import('@/../database/utils/prisma');
  const existing = await prismaModule.default.customer.findFirst({
    where: { tenantId, normalizedName, deletedAt: null },
    select: { id: true }
  });
  const duplicateCheckMs = performance.now() - startDup;

  if (existing) throw new Error('A customer with this name already exists.');

  const startFastWrite = performance.now();
  const result = await createTenantCustomerFast(tenantId, identity.id, input);
  const fastWriteTotalMs = performance.now() - startFastWrite;
  
  const totalMs = performance.now() - startTotal;
  
  return { 
    ...result.customer, 
    _debugTimings: { 
      authMs,
      tenantMs,
      permissionMs,
      subscriptionMs,
      duplicateCheckMs,
      ...result.timings,
      totalMs
    } 
  };
}

import { QueryParams, PaginatedResponse } from '../../core/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCustomers(params?: QueryParams & { createdAtStart?: Date; createdAtEnd?: Date; }): Promise<PaginatedResponse<any>> {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'READ');

  const prisma = withTenant(tenantId);
  const limit = params?.limit || 50;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { deletedAt: null, tenantId };
  
  if (params?.search) {
    where.name = { contains: params.search, mode: 'insensitive' };
  }
  
  if (params?.filters) {
    if (params.filters.industry) where.industry = params.filters.industry;
    if (params.filters.status) where.status = params.filters.status;
    if (params.filters.assignedUserId) where.assignedUserId = params.filters.assignedUserId;
  }

  if (params?.createdAtStart || params?.createdAtEnd) {
    where.createdAt = {};
    if (params.createdAtStart) where.createdAt.gte = params.createdAtStart;
    if (params.createdAtEnd) where.createdAt.lte = params.createdAtEnd;
  }

  // Allowlist sortBy to prevent dynamic key injection.
  const CUSTOMER_SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'name', 'industry', 'status']);
  const safeSortBy = CUSTOMER_SORT_FIELDS.has(params?.sortBy || '') ? params!.sortBy! : 'createdAt';
  const safeSortOrder = params?.sortOrder === 'asc' ? 'asc' : 'desc';

  const customers = await prisma.customer.findMany({
    where,
    take: limit + 1,
    ...(params?.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    orderBy: {
      [safeSortBy]: safeSortOrder
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
  
  const [customer, activities] = await Promise.all([
    prisma.customer.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        locations: { where: { deletedAt: null }, take: 100 },
        contacts: { where: { deletedAt: null }, take: 100 },
        tasks: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 20 },
        emailThreads: { orderBy: { createdAt: 'desc' }, take: 20 },
        conversations: { orderBy: { createdAt: 'desc' }, include: { messages: { take: 20, orderBy: { createdAt: 'desc' } } }, take: 20 },
        assignedUser: { select: { id: true, email: true } },
        _count: {
          select: {
            tasks: { where: { status: { not: 'COMPLETED' }, deletedAt: null } },
            contacts: { where: { deletedAt: null } },
            locations: { where: { deletedAt: null } }
          }
        }
      }
    }),
    prisma.activityTimeline.findMany({
      where: { tenantId, entityType: 'CUSTOMER', entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { actor: { select: { id: true, email: true } } }
    })
  ]);

  if (!customer) return null;

  // Attempt to find related leads by company or exact name
  const relatedLeads = await prisma.lead.findMany({
    where: { tenantId, deletedAt: null, OR: [{ company: customer.name }, { email: { in: customer.contacts.map(c => c.email).filter(Boolean) as string[] } }] },
    take: 10
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

    const updated = await tx.customer.updateMany({
      where: { id: input.id, tenantId, updatedAt: customer.updatedAt },
      data: {
        name: input.name,
        industry: input.industry,
        status: input.status,
        assignedUserId: input.assignedUserId,
      }
    });

    if (updated.count === 0) {
      throw new Error('CONCURRENCY_CONFLICT: The customer was modified by another user. Please refresh and try again.');
    }

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

    const now = new Date();
    await tx.customer.update({
      where: { id: customerId },
      data: { deletedAt: now }
    });
    await tx.customerContact.updateMany({
      where: { customerId, deletedAt: null },
      data: { deletedAt: now }
    });
    await tx.task.updateMany({
      where: { customerId, deletedAt: null },
      data: { deletedAt: now }
    });
    await tx.location.updateMany({
      where: { customerId, deletedAt: null },
      data: { deletedAt: now }
    });
    await tx.deal.updateMany({
      where: { customerId, deletedAt: null },
      data: { deletedAt: now }
    });
    await tx.cRMComment.updateMany({
      where: { entityType: 'CUSTOMER', entityId: customerId, deletedAt: null },
      data: { deletedAt: now }
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
