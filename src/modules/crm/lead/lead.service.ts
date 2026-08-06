import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { CreateLeadInput, UpdateLeadInput } from '../crm.types';

export async function createLead(input: CreateLeadInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('LEAD', 'CREATE');

  const prisma = withTenant(tenantId);

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

    return lead;
  });
}

export async function getLeads() {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('LEAD', 'READ');

  const prisma = withTenant(tenantId);
  return await prisma.lead.findMany({
    where: { deletedAt: null }
  });
}

export async function updateLead(input: UpdateLeadInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('LEAD', 'UPDATE');

  const prisma = withTenant(tenantId);

  return await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findFirst({ where: { id: input.id, tenantId }});
    if (!lead) throw new Error('Lead not found');
    
    let assignmentChanged = false;
    if (input.assignedUserId && input.assignedUserId !== lead.assignedUserId) {
      assignmentChanged = true;
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
    }

    return tx.lead.findFirst({ where: { id: input.id, tenantId }});
  });
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

    const customer = await tx.customer.create({
      data: {
        name: lead.company || lead.name,
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

    return customer;
  });
}
