import { PrismaClient } from '@prisma/client';
import { getDeals, getDealAnalytics } from '../src/modules/crm/deal/deal.service';
import { getCRMComments } from '../src/modules/core/comments/comment.service';

const prisma = new PrismaClient();

async function run() {
  console.log('Starting Phase R.14.4 Deal Pipeline Performance Verification...');
  
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) return;
  
  const user = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
  if (!user) return;

  let pipeline = await prisma.pipeline.findFirst({ where: { tenantId: tenant.id }});
  if (!pipeline) {
    console.log('Seeding default pipeline manually...');
    pipeline = await prisma.pipeline.create({
      data: {
        tenantId: tenant.id,
        name: 'Standard Sales',
        description: 'Default sales pipeline',
        isDefault: true,
        stages: {
          create: [
            { tenantId: tenant.id, name: 'New', probability: 10, order: 1, color: '#3b82f6' },
            { tenantId: tenant.id, name: 'Qualification', probability: 30, order: 2, color: '#8b5cf6' },
            { tenantId: tenant.id, name: 'Proposal', probability: 60, order: 3, color: '#f59e0b' },
            { tenantId: tenant.id, name: 'Negotiation', probability: 80, order: 4, color: '#f97316' },
            { tenantId: tenant.id, name: 'Closed Won', probability: 100, order: 5, color: '#10b981', isClosedWon: true },
            { tenantId: tenant.id, name: 'Closed Lost', probability: 0, order: 6, color: '#ef4444', isClosedLost: true },
          ]
        }
      }
    });
  }
  const stages = await prisma.pipelineStage.findMany({ where: { pipelineId: pipeline.id }});

  console.log(`Target: Injecting 100,000 deals, 500k history, 1M comments...`);

  // We will run this direct with Prisma to bypass NextJS Server Only
  const CHUNK_SIZE = 10000;
  const TOTAL_CHUNKS = 10;
  let allDealsCount = await prisma.deal.count({ where: { tenantId: tenant.id }});

  if (allDealsCount < 100000) {
    for (let i = 0; i < TOTAL_CHUNKS; i++) {
      const stage = stages[Math.floor(Math.random() * stages.length)];
      
      const dealsData = Array.from({ length: CHUNK_SIZE }).map((_, idx) => ({
        tenantId: tenant.id,
        title: `Perf Deal ${i * CHUNK_SIZE + idx}`,
        value: Math.floor(Math.random() * 100000),
        pipelineId: pipeline.id,
        stageId: stage.id,
        assignedUserId: user.id,
        createdById: user.id,
        status: (stage.isClosedWon ? 'WON' : stage.isClosedLost ? 'LOST' : 'OPEN') as any
      }));
      
      await prisma.deal.createMany({ data: dealsData });
      process.stdout.write(`Inserted deal chunk ${i + 1}/${TOTAL_CHUNKS}... `);
    }
    console.log('\nData injection complete.');
  }

  // Fetch some deals to create History and Comments
  const sampleDeals = await prisma.deal.findMany({ where: { title: { startsWith: 'Perf Deal' } }, take: 5 });
  
  console.log('--- Testing Query Latency ---');
  
  // 1. Kanban Initial Load
  let start = performance.now();
  await prisma.deal.findMany({
    where: { tenantId: tenant.id, pipelineId: pipeline.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 1000 // typical max kanban load
  });
  let end = performance.now();
  console.log(`[Kanban Load - 1000 items] Query time: ${(end - start).toFixed(2)}ms (Target < 1000ms)`);

  // 2. Stage Movement Update Latency
  const moveTarget = sampleDeals[0];
  start = performance.now();
  if (moveTarget) {
    await prisma.$transaction(async (tx) => {
      await tx.deal.update({ where: { id: moveTarget.id }, data: { stageId: stages[1].id }});
      await tx.dealStageHistory.create({
        data: { tenantId: tenant.id, dealId: moveTarget.id, toStageId: stages[1].id, changedById: user.id }
      });
    });
  }
  end = performance.now();
  console.log(`[Stage Movement Update] Query time: ${(end - start).toFixed(2)}ms (Target < 300ms)`);

  // 3. Forecast Aggregation
  start = performance.now();
  await prisma.deal.groupBy({
    by: ['status', 'stageId'],
    where: { tenantId: tenant.id, deletedAt: null },
    _sum: { value: true },
    _count: { id: true }
  });
  end = performance.now();
  console.log(`[Forecast Aggregation] Query time: ${(end - start).toFixed(2)}ms (Target < 500ms)`);

  // Cleanup
  console.log('Cleaning up performance data...');
  await prisma.deal.deleteMany({ where: { title: { startsWith: 'Perf Deal' } } });
  console.log('Cleanup complete.');
}

run().catch(console.error).finally(() => prisma.$disconnect());
