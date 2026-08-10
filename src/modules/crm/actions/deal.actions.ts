'use server';
import { getDeals, getDealById, createDeal, moveDealStage, getDealAnalytics, convertLeadToDeal, getDealTimeline } from '../deal/deal.service';
import { getPipelines, seedDefaultPipeline } from '../deal/pipeline.service';
import { revalidatePath } from 'next/cache';

export async function getPipelinesAction() {
  try {
    const data = await getPipelines();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function seedDefaultPipelineAction(tenantId: string) {
  try {
    const data = await seedDefaultPipeline(tenantId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDealsAction(params: any) {
  try {
    const data = await getDeals(params);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDealsByStageAction(stageId: string, cursor?: string) {
  try {
    const data = await getDeals({ stageId, cursor, limit: 50 });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDealByIdAction(id: string) {
  try {
    const data = await getDealById(id);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function moveDealStageAction(dealId: string, newStageId: string, lostReason?: string, lostCompetitor?: string, lostNotes?: string) {
  try {
    const data = await moveDealStage(dealId, newStageId, lostReason, lostCompetitor, lostNotes);
    revalidatePath('/deals');
    revalidatePath(`/deals/${dealId}`);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createDealAction(data: any) {
  try {
    const result = await createDeal(data);
    revalidatePath('/deals');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function convertLeadToDealAction(leadId: string, assignedUserId: string, value: number, pipelineId: string, stageId: string) {
  try {
    const data = await convertLeadToDeal(leadId, assignedUserId, value, pipelineId, stageId);
    revalidatePath('/deals');
    revalidatePath('/leads');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDealAnalyticsAction() {
  try {
    const data = await getDealAnalytics();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDealTimelineAction(dealId: string, cursor?: string, limit?: number) {
  try {
    const data = await getDealTimeline(dealId, cursor, limit);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
