import { PrismaClient } from '@prisma/client';
import { getDeals } from '../src/modules/crm/deal/deal.service';
import { getCRMComments } from '../src/modules/core/comments/comment.service';
import { getDealTimeline } from '../src/modules/crm/deal/deal.service';

const prisma = new PrismaClient();

async function run() {
  console.log('Starting Phase R.14.5 Verification...');
  
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) return;
  
  const user = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
  if (!user) return;

  const pipeline = await prisma.pipeline.findFirst({ where: { tenantId: tenant.id }});
  if (!pipeline) return;

  const stages = await prisma.pipelineStage.findMany({ where: { pipelineId: pipeline.id }});
  const firstStageId = stages[0].id;

  // Mock global auth
  (global as any).mockRequireAuth = () => ({ id: user.id });
  (global as any).mockRequireTenant = () => tenant.id;
  (global as any).mockRequirePermission = () => true;

  console.log('--- Testing Query Latency ---');
  
  // 1. Kanban Column Load
  let start = performance.now();
  await getDeals({ stageId: firstStageId, limit: 50 });
  let end = performance.now();
  console.log(`[Kanban Column Load - 50 items] Query time: ${(end - start).toFixed(2)}ms (Target < 1000ms)`);

  const deal = await prisma.deal.findFirst({ where: { tenantId: tenant.id, stageId: firstStageId } });
  if (deal) {
    // 2. Stage Movement Update Latency (OCC + Outbox)
    start = performance.now();
    const moveDealStage = require('../src/modules/crm/deal/deal.service').moveDealStage;
    await moveDealStage(deal.id, stages[1].id);
    end = performance.now();
    console.log(`[Stage Movement Update (OCC+Outbox)] Query time: ${(end - start).toFixed(2)}ms (Target < 300ms)`);

    // 3. Comments Load
    start = performance.now();
    await getCRMComments('DEAL', deal.id);
    end = performance.now();
    console.log(`[Comments Load + Security Check] Query time: ${(end - start).toFixed(2)}ms (Target < 300ms)`);

    // 4. Timeline Aggregation
    start = performance.now();
    await getDealTimeline(deal.id);
    end = performance.now();
    console.log(`[Timeline Aggregation (Deal+Lead)] Query time: ${(end - start).toFixed(2)}ms (Target < 500ms)`);
  } else {
    console.log('No deal found to test individual operations.');
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
