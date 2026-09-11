'use server';
import { withServerActionContext } from '@/lib/observability/server-action';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';

import { getDeals, getDealById, createDeal, moveDealStage, getDealAnalytics, convertLeadToDeal, getDealTimeline } from '../deal/deal.service';
import { getPipelines, seedDefaultPipeline } from '../deal/pipeline.service';
import { requireAuth, requireTenant } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

async function _getPipelinesAction() {
  try {
    const data = await getPipelines();
    return { success: true, data };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _seedDefaultPipelineAction() {
  try {
    await requireAuth();
    const tenantId = await requireTenant();
    const data = await seedDefaultPipeline(tenantId);
    return { success: true, data };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}



async function _getDealsAction(params: { pipelineId?: string; stageId?: string; assignedUserId?: string; status?: "LOST" | "OPEN" | "WON"; search?: string; cursor?: string; limit?: number; }) {
  try {
    const data = await getDeals(params);
    return { success: true, data };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _getDealsByStageAction(stageId: string, cursor?: string) {
  try {
    const data = await getDeals({ stageId, cursor, limit: 50 });
    return { success: true, data };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _getDealByIdAction(id: string) {
  try {
    const data = await getDealById(id);
    return { success: true, data };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _moveDealStageAction(dealId: string, newStageId: string, lostReason?: string, lostCompetitor?: string, lostNotes?: string) {
  try {
    const data = await moveDealStage(dealId, newStageId, lostReason, lostCompetitor, lostNotes);
    revalidatePath('/deals');
    revalidatePath(`/deals/${dealId}`);
    return { success: true, data };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

const createDealSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  source: z.string().optional(),
  value: z.number().min(0, 'Value must be positive'),
  expectedCloseDate: z.coerce.date().optional(),
  pipelineId: z.string().uuid('Invalid pipeline ID'),
  stageId: z.string().uuid('Invalid stage ID'),
  customerId: z.string().uuid('Invalid customer ID').optional(),
  assignedUserId: z.string().uuid('Invalid user ID')
});

async function _getAssignableUsersAction() {
  try {
    const tenantId = await requireTenant();
    await requireAuth();
    // A regular user can fetch assignable users within the tenant
    const prisma = withTenant(tenantId);
    const users = await prisma.user.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true, email: true },
      orderBy: { email: 'asc' }
    });
    return { success: true, data: users };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}



async function _createDealAction(data: z.infer<typeof createDealSchema>) {
  try {
    const validatedData = createDealSchema.parse(data);
    const result = await createDeal(validatedData);
    revalidatePath('/deals');
    return { success: true, data: result };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _convertLeadToDealAction(leadId: string, assignedUserId: string, value: number, pipelineId: string, stageId: string) {
  try {
    const data = await convertLeadToDeal(leadId, assignedUserId, value, pipelineId, stageId);
    revalidatePath('/deals');
    revalidatePath('/leads');
    return { success: true, data };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _getDealAnalyticsAction() {
  try {
    const data = await getDealAnalytics();
    return { success: true, data };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _getDealTimelineAction(dealId: string, cursor?: string, limit?: number) {
  try {
    const data = await getDealTimeline(dealId, cursor, limit);
    return { success: true, data };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getPipelinesAction = withServerActionContext(_getPipelinesAction);

export const seedDefaultPipelineAction = withServerActionContext(_seedDefaultPipelineAction);

export const getDealsAction = withServerActionContext(_getDealsAction);

export const getDealsByStageAction = withServerActionContext(_getDealsByStageAction);

export const getDealByIdAction = withServerActionContext(_getDealByIdAction);

export const moveDealStageAction = withServerActionContext(_moveDealStageAction);

export const getAssignableUsersAction = withServerActionContext(_getAssignableUsersAction);

export const createDealAction = withServerActionContext(_createDealAction);

export const convertLeadToDealAction = withServerActionContext(_convertLeadToDealAction);

export const getDealAnalyticsAction = withServerActionContext(_getDealAnalyticsAction);

export const getDealTimelineAction = withServerActionContext(_getDealTimelineAction);

const updateDealSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  source: z.string().optional(),
  value: z.number().min(0, 'Value must be positive').optional(),
  expectedCloseDate: z.coerce.date().nullable().optional(),
  pipelineId: z.string().uuid('Invalid pipeline ID').optional(),
  stageId: z.string().uuid('Invalid stage ID').optional(),
  customerId: z.string().uuid('Invalid customer ID').nullable().optional(),
  assignedUserId: z.string().uuid('Invalid user ID').optional()
});

async function _updateDealAction(dealId: string, data: z.infer<typeof updateDealSchema>) {
  try {
    const validatedData = updateDealSchema.parse(data);

    // We dynamically import updateDeal to avoid circular deps if they exist,
    // or we can just use a regular require since this is a server action
    const { updateDeal } = await import('../deal/deal.service');

    const result = await updateDeal(dealId, validatedData);
    revalidatePath('/deals');
    revalidatePath(`/deals/${dealId}`);
    return { success: true, data: result };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _archiveDealAction(dealId: string) {
  try {
    const { archiveDeal } = await import('../deal/deal.service');
    const result = await archiveDeal(dealId);
    revalidatePath('/deals');
    return { success: true, data: result };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const updateDealAction = withServerActionContext(_updateDealAction);
export const archiveDealAction = withServerActionContext(_archiveDealAction);
