import { withTenant } from '../../database/utils/prisma-tenant';
import { PrismaClient } from '@prisma/client';

const globalPrisma = new PrismaClient();

async function runProfileH() {
  console.log('--- Phase 11 Profile H (Reporting / Export) ---');
  const tenantId = '11111111-1111-4111-8111-111111111111';
  const tenantPrisma = withTenant(tenantId);
  const concurrency = parseInt(process.env.CONCURRENCY || '10');
  const iterations = parseInt(process.env.ITERATIONS || '2');

  const start = Date.now();
  let errors = 0;
  let rowsProcessed = 0;
  const latencies: number[] = [];

  const workers = Array.from({ length: concurrency }).map(async (_, idx) => {
    for (let i = 0; i < iterations; i++) {
      try {
        const opStart = Date.now();
        // Heavy unpaginated export
        const result = await tenantPrisma.customer.findMany({
          include: { leads: true, tasks: true },
          orderBy: { createdAt: 'desc' }
        });
        rowsProcessed += result.length;
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
  console.log(`Rows Processed: ${rowsProcessed}`);
  console.log(`Errors: ${errors}`);
  console.log(`P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms`);
  console.log(`Export Throughput: ${((concurrency * iterations) / (duration / 1000)).toFixed(2)} ops/sec`);

  await globalPrisma.$disconnect();
}

runProfileH().catch(console.error);
