import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { CreateLeadInput, UpdateLeadInput } from '../crm.types';
import { EventBus } from '../../core/events/event-bus';

export async function createLead(input: CreateLeadInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('LEAD', 'CREATE');

  const prisma = withTenant(tenantId);

  // BUG-CRM-LEAD-001 Duplicate Prevention
  if (input.email) {
    const existing = await prisma.lead.findFirst({ where: { tenantId, email: input.email } });
    if (existing) throw new Error('A lead with this email already exists.');
  } else {
    const existing = await prisma.lead.findFirst({ where: { tenantId, name: input.name, company: input.company } });
    if (existing) throw new Error('A lead with this name and company already exists.');
  }
  // BUG-CRM-SEC-002 Cross Tenant Lead Assignment Prevention
  if (input.assignedUserId) {
    const user = await prisma.user.findFirst({ where: { id: input.assignedUserId, tenantId } });
    if (!user) throw new Error('Assigned user does not belong to this tenant.');
  }

  return await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        name: input.name,
        company: input.company,
        email: input.email,
        phone: input.phone,
        assignedUserId: input.assignedUserId,
        tenantId
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'LEAD_CREATED',
        resource: 'LEAD',
        resourceId: lead.id,
        metadata: { name: lead.name, company: lead.company }
      }
    });

    await tx.activityTimeline.create({
      data: {
        tenantId,
        type: 'SYSTEM',
        content: `Lead created: ${lead.name || lead.company}`,
        actorId: user.id,
        entityType: 'LEAD',
        entityId: lead.id
      }
    });

    return lead;
  });
}

import { QueryParams, PaginatedResponse } from '../../core/types';

export async function getLeads(params?: QueryParams & { createdAtStart?: Date; createdAtEnd?: Date; }): Promise<PaginatedResponse<any>> {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('LEAD', 'READ');

  const prisma = withTenant(tenantId);
  const limit = params?.limit || 50;
  
  const where: any = { deletedAt: null, tenantId };
  
  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { company: { contains: params.search, mode: 'insensitive' } },
      { email: { contains: params.search, mode: 'insensitive' } }
    ];
  }
  
  if (params?.filters) {
    if (params.filters.status) where.status = params.filters.status;
    if (params.filters.assignedUserId) where.assignedUserId = params.filters.assignedUserId;
  }

  if (params?.createdAtStart || params?.createdAtEnd) {
    where.createdAt = {};
    if (params.createdAtStart) where.createdAt.gte = params.createdAtStart;
    if (params.createdAtEnd) where.createdAt.lte = params.createdAtEnd;
  }

  const leads = await prisma.lead.findMany({
    where,
    take: limit + 1,
    ...(params?.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    orderBy: {
      [params?.sortBy || 'createdAt']: params?.sortOrder || 'desc'
    }
  });

  const hasMore = leads.length > limit;
  const data = hasMore ? leads.slice(0, -1) : leads;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return {
    data,
    pagination: {
      nextCursor,
      hasMore
    }
  };
}

export async function updateLead(input: UpdateLeadInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('LEAD', 'UPDATE');

  const prisma = withTenant(tenantId);

  // BUG-CRM-SEC-002 Cross Tenant Lead Assignment Prevention
  if (input.assignedUserId) {
    const user = await prisma.user.findFirst({ where: { id: input.assignedUserId, tenantId } });
    if (!user) throw new Error('Assigned user does not belong to this tenant.');
  }

  const result = await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findFirst({ where: { id: input.id, tenantId }});
    if (!lead) throw new Error('Lead not found');
    
    let assignmentChanged = false;
    if (input.assignedUserId && input.assignedUserId !== lead.assignedUserId) {
      assignmentChanged = true;
    }

    let statusChanged = false;
    if (input.status && input.status !== lead.status) {
      statusChanged = true;
    }

    const updated = await tx.lead.updateMany({
      where: { id: input.id, tenantId },
      data: {
        name: input.name,
        company: input.company,
        email: input.email,
        phone: input.phone,
        status: input.status,
        assignedUserId: input.assignedUserId,
      }
    });

    if (assignmentChanged) {
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: user.id,
          actorType: 'USER',
          action: 'LEAD_ASSIGNMENT_CHANGED',
          resource: 'LEAD',
          resourceId: input.id,
          metadata: { newAssignedUserId: input.assignedUserId }
        }
      });
      await tx.activityTimeline.create({
        data: {
          tenantId,
          type: 'SYSTEM',
          content: `Lead assigned to user ID: ${input.assignedUserId}`,
          actorId: user.id,
          entityType: 'LEAD',
          entityId: input.id
        }
      });
    }

    if (statusChanged) {
      await tx.activityTimeline.create({
        data: {
          tenantId,
          type: 'SYSTEM',
          content: `Lead status changed from ${lead.status} to ${input.status}`,
          actorId: user.id,
          entityType: 'LEAD',
          entityId: input.id
        }
      });
      
      // Attempt to find user to notify (if assigned)
      if (lead.assignedUserId || input.assignedUserId) {
        await tx.notification.create({
          data: {
            tenantId,
            userId: input.assignedUserId || lead.assignedUserId!,
            type: 'SYSTEM',
            title: 'Lead Status Updated',
            body: `Lead ${lead.company || lead.name} was moved to ${input.status}`,
            actionUrl: `/leads`
          }
        });
      }
    }

    const updatedLead = await tx.lead.findFirst({ where: { id: input.id, tenantId }, include: { assignedUser: { select: { id: true, email: true } } }});
    return { lead: updatedLead, assignmentChanged };
  });

  if (result.assignmentChanged && input.assignedUserId) {
    EventBus.emit('lead.assigned', { 
      tenantId, 
      leadId: input.id, 
      assigneeId: input.assignedUserId 
    });
  }

  return result.lead;
}

export async function convertLeadToCustomer(leadId: string) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('LEAD', 'UPDATE');
  await requirePermission('CUSTOMER', 'CREATE');

  const prisma = withTenant(tenantId);

  return await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new Error('Lead not found');

    const customerName = lead.company || lead.name;
    const normalizedName = customerName.toLowerCase().trim().replace(/\s+/g, ' ');

    const customer = await tx.customer.create({
      data: {
        name: customerName,
        normalizedName,
        assignedUserId: lead.assignedUserId,
        tenantId
      }
    });

    await tx.lead.updateMany({
      where: { id: leadId, tenantId },
      data: { status: 'CONVERTED' }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'LEAD_CONVERTED',
        resource: 'LEAD',
        resourceId: leadId,
        metadata: { newCustomerId: customer.id }
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
        metadata: { source: 'LEAD_CONVERSION', leadId: leadId }
      }
    });

    await tx.activityTimeline.create({
      data: {
        tenantId,
        type: 'SYSTEM',
        content: `Lead converted to Customer`,
        actorId: user.id,
        entityType: 'LEAD',
        entityId: lead.id
      }
    });

    await tx.activityTimeline.create({
      data: {
        tenantId,
        type: 'SYSTEM',
        content: `Customer created from Lead conversion`,
        actorId: user.id,
        entityType: 'CUSTOMER',
        entityId: customer.id
      }
    });

    return customer;
  });
}

export async function deleteLead(leadId: string) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('LEAD', 'DELETE');

  const prisma = withTenant(tenantId);

  return await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findFirst({ where: { id: leadId, tenantId, deletedAt: null } });
    if (!lead) throw new Error('Lead not found');

    await tx.lead.update({
      where: { id: leadId },
      data: { deletedAt: new Date() }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'LEAD_DELETED',
        resource: 'LEAD',
        resourceId: leadId,
      }
    });

    return { success: true };
  });
}
