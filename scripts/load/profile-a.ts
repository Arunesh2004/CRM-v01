import { withTenant } from '../../database/utils/prisma-tenant';
import { PrismaClient } from '@prisma/client';

const globalPrisma = new PrismaClient();

async function runProfileA() {
  console.log('--- Phase 11 Profile A (Normal CRM) Load Test ---');
  const tenantId = '11111111-1111-4111-8111-111111111111';
  const tenantPrisma = withTenant(tenantId);
  const concurrency = parseInt(process.env.CONCURRENCY || '25');
  const iterations = parseInt(process.env.ITERATIONS || '5');

  const start = Date.now();
  let errors = 0;
  const latencies: number[] = [];

  const workers = Array.from({ length: concurrency }).map(async (_, workerIdx) => {
    for (let i = 0; i < iterations; i++) {
      try {
        const opStart = Date.now();
        const type = (workerIdx + i) % 4;

        if (type === 0) {
          // List Customers
          await tenantPrisma.customer.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
        } else if (type === 1) {
          // List Leads
          await tenantPrisma.lead.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
        } else if (type === 2) {
          // List Tasks
          await tenantPrisma.task.findMany({ take: 50, where: { status: 'PENDING' } });
        } else {
          // Single Write
          await tenantPrisma.task.create({
            data: {
              tenantId,
              title: `Profile A Task ${Date.now()}`,
              status: 'PENDING',
              priority: 'LOW'
            }
          });
        }
        latencies.push(Date.now() - opStart);
      } catch (e) {
        if (errors === 0) console.error('Sample Error:', e);
        errors++;
      }
    }
  });

  await Promise.all(workers);
  const duration = Date.now() - start;

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  console.log(`Duration: ${duration}ms`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Total Ops: ${concurrency * iterations}`);
  console.log(`Errors: ${errors}`);
  console.log(`P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms`);
  console.log(`Throughput: ${((concurrency * iterations) / (duration / 1000)).toFixed(2)} ops/sec`);

  await globalPrisma.$disconnect();
}

runProfileA().catch(console.error);
