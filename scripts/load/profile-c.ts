import { withTenant } from '../../database/utils/prisma-tenant';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const globalPrisma = new PrismaClient();

async function runProfileC() {
  console.log('--- Phase 11 Profile C (EventOutbox Burst) Load Test ---');
  const tenantId = '11111111-1111-4111-8111-111111111111';
  const tenantPrisma = withTenant(tenantId);
  const concurrency = parseInt(process.env.CONCURRENCY || '50');
  const iterations = parseInt(process.env.ITERATIONS || '20'); // 1000 total events

  const start = Date.now();
  let errors = 0;
  const latencies: number[] = [];

  const workers = Array.from({ length: concurrency }).map(async () => {
    for (let i = 0; i < iterations; i++) {
      try {
        const opStart = Date.now();
        await tenantPrisma.eventOutbox.create({
          data: {
            tenantId,
            eventId: crypto.randomUUID(),
            eventType: 'USER_CREATED',
            payload: { user: `test-${Date.now()}` },
            status: 'PENDING'
          }
        });
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
  console.log(`Insert Throughput: ${((concurrency * iterations) / (duration / 1000)).toFixed(2)} ops/sec`);

  // Observe backlog size
  const backlogCount = await tenantPrisma.eventOutbox.count({ where: { status: 'PENDING' } });
  console.log(`Initial Pending Backlog: ${backlogCount}`);

  if (backlogCount > 0) {
    console.log('Polling backlog for 5 seconds to observe processing...');
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newCount = await tenantPrisma.eventOutbox.count({ where: { status: 'PENDING' } });
      console.log(`Backlog at +${i+1}s: ${newCount}`);
    }
  }

  await globalPrisma.$disconnect();
}

runProfileC().catch(console.error);
