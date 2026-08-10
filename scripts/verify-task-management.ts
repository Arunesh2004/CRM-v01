import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Starting Phase R.14.2 Task Performance Verification (Direct Prisma)...');
  
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) return;
  const user = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
  if (!user) return;

  console.log('--- Testing Query Latency ---');
  
  // 1. Task List Query Time
  let start = performance.now();
  await prisma.task.findMany({
    where: { tenantId: tenant.id, deletedAt: null },
    take: 50,
    orderBy: { createdAt: 'desc' }
  });
  let end = performance.now();
  console.log(`[Task List - 50 items] Query time: ${(end - start).toFixed(2)}ms`);

  // 2. Filter Query Time (Priority + Status)
  start = performance.now();
  await prisma.task.findMany({
    where: { 
      tenantId: tenant.id, 
      deletedAt: null,
      priority: 'URGENT',
      status: 'PENDING'
    },
    take: 50,
    orderBy: { createdAt: 'desc' }
  });
  end = performance.now();
  console.log(`[Task Filter - URGENT + PENDING] Query time: ${(end - start).toFixed(2)}ms`);

  // 3. Calendar Query Time (500 limit)
  start = performance.now();
  await prisma.task.findMany({
    where: { tenantId: tenant.id, deletedAt: null },
    take: 500,
    orderBy: { createdAt: 'desc' }
  });
  end = performance.now();
  console.log(`[Calendar Fetch - 500 items] Query time: ${(end - start).toFixed(2)}ms`);

  // 4. Workload Aggregation Time
  start = performance.now();
  
  const now = new Date();
  await prisma.task.groupBy({
    by: ['assignedUserId', 'status'],
    where: { tenantId: tenant.id, deletedAt: null },
    _count: { id: true }
  });
  await prisma.task.groupBy({
    by: ['assignedUserId'],
    where: { 
      tenantId: tenant.id, 
      deletedAt: null, 
      status: { not: 'COMPLETED' },
      dueDate: { lt: now } 
    },
    _count: { id: true }
  });
  end = performance.now();
  console.log(`[Workload Aggregation - 100k rows] Query time: ${(end - start).toFixed(2)}ms`);

  // Cleanup
  console.log('Cleaning up 100,000 tasks...');
  await prisma.task.deleteMany({ where: { description: 'Auto-generated for benchmark' } });
  console.log('Cleanup complete.');
}

run().catch(console.error).finally(() => prisma.$disconnect());
