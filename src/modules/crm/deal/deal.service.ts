import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import globalPrisma from '@db/utils/prisma';

export async function getDeals(params?: {
  pipelineId?: string;
  stageId?: string;
  assignedUserId?: string;
  status?: 'OPEN' | 'WON' | 'LOST';
  search?: string;
  cursor?: string;
  limit?: number;
}) {
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);
  await requirePermission('CUSTOMER', 'READ'); // Basic access

  const where: Prisma.DealWhereInput = {
    tenantId,
    deletedAt: null
  };

  if (params?.pipelineId) where.pipelineId = params.pipelineId;
  if (params?.stageId) where.stageId = params.stageId;
  if (params?.assignedUserId) where.assignedUserId = params.assignedUserId;
  if (params?.status) where.status = params.status;
  if (params?.search) {
    where.OR = [
      { title: { contains: params.search, mode: 'insensitive' } },
      { customer: { name: { contains: params.search, mode: 'insensitive' } } }
    ];
  }

  const args: any = {
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { id: true, name: true, company: true } },
      assignedUser: { select: { id: true, email: true } },
      stage: { select: { id: true, name: true, probability: true, isClosedWon: true, isClosedLost: true, color: true } }
    }
  };

  if (params?.limit) {
    args.take = params.limit + 1; // fetch 1 extra to check hasMore
  }
  if (params?.cursor) {
    args.cursor = { id: params.cursor };
    args.skip = 1; // skip the cursor itself
  }

  const results = await prisma.deal.findMany(args);
  
  let hasMore = false;
  let data = results;
  if (params?.limit && results.length > params.limit) {
    hasMore = true;
    data = results.slice(0, params.limit);
  }

  return { data, hasMore };
}

export async function getDealById(id: string) {
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);
  await requirePermission('CUSTOMER', 'READ');

  const deal = await prisma.deal.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      customer: true,
      lead: true,
      assignedUser: { select: { id: true, email: true } },
      createdUser: { select: { id: true, email: true } },
      stage: true,
      pipeline: true,
      stageHistory: {
        orderBy: { createdAt: 'desc' },
        include: {
          fromStage: { select: { name: true } },
          toStage: { select: { name: true } },
          changedBy: { select: { id: true, email: true } }
        }
      },
      tasks: {
        where: { deletedAt: null },
        orderBy: { dueDate: 'asc' }
      }
    }
  });

  if (!deal) throw new Error('Deal not found');
  return deal;
}

export async function createDeal(data: {
  title: string;
  description?: string;
  source?: string;
  value: number;
  expectedCloseDate?: Date;
  pipelineId: string;
  stageId: string;
  customerId?: string;
  assignedUserId: string;
}) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);
  await requirePermission('CUSTOMER', 'CREATE');

  return await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    
    // Explicit tenant boundary checks to prevent BOLA via nested foreign key assignment
    if (data.customerId) {
       const customer = await tx.customer.findFirst({ where: { id: data.customerId, tenantId } });
       if (!customer) throw new Error('Customer not found in current tenant');
    }
    const pipeline = await tx.pipeline.findFirst({ where: { id: data.pipelineId, tenantId } });
    if (!pipeline) throw new Error('Pipeline not found in current tenant');
    
    const stage = await tx.pipelineStage.findFirst({ where: { id: data.stageId, tenantId } });
    if (!stage) throw new Error('Stage not found in current tenant');

    const assignee = await tx.user.findFirst({ where: { id: data.assignedUserId, tenantId } });
    if (!assignee) throw new Error('Assigned user not found in current tenant');

    const deal = await tx.deal.create({
      data: {
        tenantId,
        createdById: user.id,
        title: data.title,
        description: data.description,
        source: data.source,
        value: data.value,
        expectedCloseDate: data.expectedCloseDate,
        pipelineId: data.pipelineId,
        stageId: data.stageId,
        customerId: data.customerId,
        assignedUserId: data.assignedUserId,
      },
      include: { stage: true }
    });

    // Record initial history
    await tx.dealStageHistory.create({
      data: {
        tenantId,
        dealId: deal.id,
        toStageId: data.stageId,
        changedById: user.id
      }
    });

    // Timeline
    await tx.activityTimeline.create({
      data: {
        tenantId,
        entityType: 'DEAL',
        entityId: deal.id,
        actorId: user.id,
        type: 'SYSTEM',
        content: `Deal created in stage: ${deal.stage.name}`,
      }
    });

    await tx.eventOutbox.create({
      data: {
        eventId: crypto.randomUUID(),
        tenantId,
        eventType: 'DEAL_CREATED',
        payload: { actorId: user.id, resource: 'DEAL', action: 'CREATE', metadata: { dealId: deal.id } }
      }
    });

    return deal;
  });
}

export async function convertLeadToDeal(leadId: string, assignedUserId: string, value: number, pipelineId: string, stageId: string) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);
  await requirePermission('CUSTOMER', 'UPDATE');

  const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
  if (!lead) throw new Error('Lead not found');

  return await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    // Note: If customer already exists for this lead (it shouldn't normally if it's just a lead, 
    // but in case conversion happened partially), we can link or create customer.
    // For simplicity, we just create the deal linked to the Lead.
    // Real CRM conversion creates Customer AND Deal.
    
    let customerId = undefined;
    // Find or create customer from lead
    const normalizedName = lead.name.toLowerCase().trim();
    let customer = await tx.customer.findFirst({ where: { tenantId, normalizedName, deletedAt: null } });
    if (!customer) {
      customer = await tx.customer.create({
        data: {
          tenantId,
          name: lead.name,
          normalizedName,
          assignedUserId: lead.assignedUserId || assignedUserId,
          status: 'ACTIVE'
        }
      });
    }
    customerId = customer.id;

    const deal = await tx.deal.create({
      data: {
        tenantId,
        title: `${lead.company || lead.name} Deal`,
        value,
        pipelineId,
        stageId,
        customerId,
        leadId,
        assignedUserId,
        createdById: user.id
      },
      include: { stage: true }
    });

    // Update Lead to converted
    await tx.lead.update({
      where: { id: leadId },
      data: { status: 'CONVERTED' }
    });

    // History and Timeline
    await tx.dealStageHistory.create({
      data: { tenantId, dealId: deal.id, toStageId: stageId, changedById: user.id }
    });
    await tx.activityTimeline.create({
      data: { tenantId, entityType: 'DEAL', entityId: deal.id, actorType: 'USER', actorId: user.id, type: 'SYSTEM', content: `Converted from Lead` }
    });

    await tx.eventOutbox.create({
      data: {
        eventId: crypto.randomUUID(),
        tenantId,
        eventType: 'DEAL_CREATED',
        payload: { actorId: user.id, resource: 'DEAL', action: 'CREATE', metadata: { dealId: deal.id, convertedFromLeadId: leadId } }
      }
    });

    return deal;
  });
}

export async function moveDealStage(dealId: string, newStageId: string, lostReason?: string, lostCompetitor?: string, lostNotes?: string) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);
  await requirePermission('CUSTOMER', 'UPDATE');

  return await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    const deal = await tx.deal.findFirst({ where: { id: dealId, tenantId }, include: { stage: true } });
    if (!deal) throw new Error('Deal not found');

    const newStage = await tx.pipelineStage.findFirst({ where: { id: newStageId, tenantId } });
    if (!newStage) throw new Error('Stage not found');

    if (deal.stageId === newStageId) return deal;

    let status: 'OPEN' | 'WON' | 'LOST' = 'OPEN';
    let actualCloseDate: Date | null = deal.actualCloseDate;
    
    if (newStage.isClosedWon) {
      status = 'WON';
      actualCloseDate = new Date();
    } else if (newStage.isClosedLost) {
      status = 'LOST';
      actualCloseDate = new Date();
    }

    const updated = await tx.deal.updateMany({
      where: { id: dealId, version: deal.version },
      data: {
        stageId: newStageId,
        status,
        actualCloseDate,
        lostReason: status === 'LOST' ? lostReason : null,
        lostCompetitor: status === 'LOST' ? lostCompetitor : null,
        lostNotes: status === 'LOST' ? lostNotes : null,
        lostAt: status === 'LOST' ? new Date() : null,
        version: { increment: 1 }
      }
    });

    if (updated.count === 0) {
      throw new Error('Concurrency conflict: Deal was updated by another user');
    }

    // History & Timeline
    await tx.dealStageHistory.create({
      data: {
        tenantId,
        dealId,
        fromStageId: deal.stageId,
        toStageId: newStageId,
        changedById: user.id
      }
    });

    await tx.activityTimeline.create({
      data: {
        tenantId, entityType: 'DEAL', entityId: dealId, actorType: 'USER', actorId: user.id, type: 'SYSTEM',
        content: `Moved to stage: ${newStage.name}`,
      }
    });

    await tx.eventOutbox.create({
      data: {
        eventId: crypto.randomUUID(),
        tenantId,
        eventType: 'DEAL_STAGE_CHANGED',
        payload: { actorId: user.id, resource: 'DEAL', action: 'UPDATE', metadata: { dealId, fromStageId: deal.stageId, toStageId: newStageId } }
      }
    });

    if (status === 'WON') {
      await tx.eventOutbox.create({
        data: { eventId: crypto.randomUUID(), tenantId, eventType: 'DEAL_WON', payload: { actorId: user.id, resource: 'DEAL', action: 'UPDATE', metadata: { dealId } } }
      });
    }
    if (status === 'LOST') {
      await tx.eventOutbox.create({
        data: { eventId: crypto.randomUUID(), tenantId, eventType: 'DEAL_LOST', payload: { actorId: user.id, resource: 'DEAL', action: 'UPDATE', metadata: { dealId } } }
      });
    }

    // Return the updated deal representation
    return { ...deal, stageId: newStageId, status, version: deal.version + 1 };
  });
}

export async function getDealAnalytics() {
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);
  await requirePermission('CUSTOMER', 'READ');

  const deals = await prisma.deal.findMany({
    where: { tenantId, deletedAt: null },
    select: { value: true, probability: true, status: true, expectedCloseDate: true, stage: { select: { probability: true } } }
  });

  let totalPipelineValue = 0;
  let weightedPipelineValue = 0;
  let wonRevenue = 0;
  let lostRevenue = 0;
  let activeDealsCount = 0;
  let wonDealsCount = 0;

  const now = new Date();
  let closingThisMonth = 0;

  deals.forEach(d => {
    if (d.status === 'WON') {
      wonRevenue += d.value;
      wonDealsCount++;
    } else if (d.status === 'LOST') {
      lostRevenue += d.value;
    } else {
      totalPipelineValue += d.value;
      const p = d.probability ?? d.stage.probability;
      weightedPipelineValue += (d.value * p) / 100;
      activeDealsCount++;

      if (d.expectedCloseDate && d.expectedCloseDate.getMonth() === now.getMonth() && d.expectedCloseDate.getFullYear() === now.getFullYear()) {
        closingThisMonth++;
      }
    }
  });

  const winRate = (wonDealsCount + (deals.length - activeDealsCount > 0 ? (deals.length - activeDealsCount - wonDealsCount) : 0)) > 0 
    ? (wonDealsCount / (deals.length - activeDealsCount)) * 100 
    : 0;

  const averageDealSize = wonDealsCount > 0 ? wonRevenue / wonDealsCount : 0;

  return {
    totalPipelineValue,
    weightedPipelineValue,
    wonRevenue,
    lostRevenue,
    activeDealsCount,
    closingThisMonth,
    winRate: Math.round(winRate),
    averageDealSize
  };
}

export async function getDealTimeline(
  dealId: string,
  cursor?: string,
  limit: number = 50
) {
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);
  await requirePermission('CUSTOMER', 'READ');

  const deal = await prisma.deal.findFirst({ where: { id: dealId, tenantId, deletedAt: null } });
  if (!deal) throw new Error('Deal not found');

  const conditions: any[] = [{ entityType: 'DEAL', entityId: dealId }];
  if (deal.leadId) {
    conditions.push({ entityType: 'LEAD', entityId: deal.leadId });
  }

  const take = limit + 1;
  const timeline = await prisma.activityTimeline.findMany({
    where: {
      tenantId,
      OR: conditions,
      ...(cursor ? { id: { lt: cursor } } : {})
    },
    orderBy: { createdAt: 'desc' },
    take
  });

  const hasMore = timeline.length > limit;
  const events = hasMore ? timeline.slice(0, limit) : timeline;
  const nextCursor = hasMore && events.length > 0 ? events[events.length - 1].id : null;

  return { events, hasMore, nextCursor };
}

