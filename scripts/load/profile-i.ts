import { SystemOperation, executeAsSystem } from '../../database/utils/prisma-system';
import { withTenant } from '../../database/utils/prisma-tenant';
import { PrismaClient } from '@prisma/client';
import { ProviderFactory } from '../../src/lib/providers/provider.factory';
import { AIProviderFactory } from '../../src/lib/providers/ai/ai-provider.factory';

// Note: LOAD_TEST_MODE is true in env
const globalPrisma = new PrismaClient();

import crypto from 'crypto';

async function runProfileI() {
  console.log('--- Phase 11 Profile I (Mixed Enterprise) Load Test ---');
  const tenantId = crypto.randomUUID();
  await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
    await tx.tenant.create({ data: { id: tenantId, name: 'Profile I Tenant', status: 'ACTIVE' } });
    const customers = Array.from({length:100}).map(()=>({id:crypto.randomUUID(), tenantId, name:crypto.randomUUID(), normalizedName:crypto.randomUUID(), status:'ACTIVE' as const}));
    await tx.customer.createMany({data:customers});
  });

  const tenantPrisma = withTenant(tenantId);
  const concurrency = parseInt(process.env.CONCURRENCY || '25');

  const emailProvider = ProviderFactory.getEmailProvider();
  const aiProvider = AIProviderFactory.getProvider('MOCK');

  const start = Date.now();
  let errors = 0;
  const latencies: number[] = [];

  const workers = Array.from({ length: concurrency }).map(async (_, idx) => {
    try {
      const opStart = Date.now();
      
      const type = idx % 5;
      if (type === 0) {
        // Standard CRM Read
        await tenantPrisma.customer.findMany({ take: 20 });
      } else if (type === 1) {
        // Communication (Email)
        await emailProvider.sendEmail(tenantId, { to: 'test@test.com', subject: 'Load', text: 'Test' });
      } else if (type === 2) {
        // AI Request
        await aiProvider.generateContent(tenantId, 'sys', 'prompt');
      } else if (type === 3) {
        // EventOutbox Insert
        await tenantPrisma.eventOutbox.create({
          data: {
            tenantId,
            eventId: crypto.randomUUID(),
            eventType: 'USER_CREATED',
            payload: { user: 'test' },
            status: 'PENDING'
          }
        });
      } else {
        // Write Operation
        await tenantPrisma.task.create({
          data: {
            tenantId,
            title: `Mixed Task ${Date.now()}`,
            status: 'PENDING'
          }
        });
      }

      latencies.push(Date.now() - opStart);
    } catch (e: any) {
      errors++;
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
  console.log(`Errors: ${errors}`);
  console.log(`P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms`);
  console.log(`Throughput: ${(concurrency / (duration / 1000)).toFixed(2)} ops/sec`);

  await globalPrisma.$disconnect();
}

runProfileI().catch(console.error);
