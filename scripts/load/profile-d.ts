import { withTenant } from '../../database/utils/prisma-tenant';
import { PrismaClient } from '@prisma/client';
import { outboxWorkerHandler } from '../../src/lib/queue/functions/outbox.worker';
import crypto from 'crypto';

const globalPrisma = new PrismaClient();

async function runProfileD() {
  console.log('--- Phase 11 Profile D (Communication Mock Burst) ---');
  const tenantId = '11111111-1111-4111-8111-111111111111';
  const concurrency = parseInt(process.env.CONCURRENCY || '25');
  const iterations = parseInt(process.env.ITERATIONS || '10');

  console.log(`NOTE: Inngest execution cannot be observed directly in this isolated environment.`);
  console.log(`We are directly invoking the worker handler to measure application processing throughput.`);

  const start = Date.now();
  let errors = 0;
  const latencies: number[] = [];

  const mockStep = {
    run: async (name: string, fn: () => Promise<any>) => {
      return await fn();
    }
  };

  const workers = Array.from({ length: concurrency }).map(async () => {
    for (let i = 0; i < iterations; i++) {
      const jobId = crypto.randomUUID();
      try {
        const opStart = Date.now();
        await outboxWorkerHandler({
          event: {
            data: {
              jobId,
              tenantId,
              jobType: 'SEND_EMAIL',
              actorType: 'SYSTEM',
              actorId: 'system',
              payload: {
                to: 'test@example.com',
                subject: 'Load Test',
                text: 'Hello world'
              },
              correlationId: jobId,
              timestamp: new Date().toISOString()
            }
          },
          step: mockStep
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
  console.log(`Processing Throughput: ${((concurrency * iterations) / (duration / 1000)).toFixed(2)} ops/sec`);

  await globalPrisma.$disconnect();
}

runProfileD().catch(console.error);
