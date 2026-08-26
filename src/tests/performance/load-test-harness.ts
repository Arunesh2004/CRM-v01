import { PrismaClient } from '@prisma/client';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { withTenant, withTenantTransaction } from '../../../database/utils/prisma-tenant';
import crypto from 'crypto';

const prisma = new PrismaClient();

const CONCURRENCY_LEVELS = [1, 5, 10, 25, 50, 100];
const ITERATIONS_PER_WORKER = 50;

const tenants = [
  { id: crypto.randomUUID(), name: 'Tenant A Test' },
  { id: crypto.randomUUID(), name: 'Tenant B Test' },
  { id: crypto.randomUUID(), name: 'Tenant C Test' },
];

async function setupFixtures() {
  await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
    for (const tenant of tenants) {
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenant.id}', '${tenant.name}', now(), now()) ON CONFLICT DO NOTHING;`);
      
      const userId = crypto.randomUUID();
      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, "tenantId", email, status, "createdAt", "updatedAt") VALUES ('${userId}', '${tenant.id}', 'user_${tenant.id}@test.com', 'ACTIVE', now(), now());`);
      
      const customerId = crypto.randomUUID();
      await tx.$executeRawUnsafe(`INSERT INTO "Customer" (id, "tenantId", name, "normalizedName", "createdAt", "updatedAt") VALUES ('${customerId}', '${tenant.id}', 'MARKER_CUST_${tenant.id}', 'marker_cust_${tenant.id}', now(), now());`);
    }
  });
}

async function performRead(tenantId: string) {
  const tenantPrisma = withTenant(tenantId);
  const customers = await tenantPrisma.customer.findMany({
    where: { name: { startsWith: 'MARKER_CUST_' } }
  });
  for (const c of customers) {
    if (!c.name.includes(tenantId)) throw new Error(`CROSS-TENANT LEAK DETECTED: Tenant ${tenantId} read Customer ${c.name}`);
  }
}

async function performWrite(tenantId: string) {
  const tenantPrisma = withTenant(tenantId);
  await tenantPrisma.$transaction(async (tx) => {
    const scopedTx = await withTenantTransaction(tx, tenantId);
    await scopedTx.task.create({
      data: {
        tenantId,
        title: `MARKER_TASK_${tenantId}_${crypto.randomUUID()}`,
        status: 'PENDING'
      }
    });
  });
}

async function performTransactionFailure(tenantId: string) {
  const tenantPrisma = withTenant(tenantId);
  try {
    await tenantPrisma.$transaction(async (tx) => {
      const scopedTx = await withTenantTransaction(tx, tenantId);
      await scopedTx.task.create({
        data: { tenantId, title: `SHOULD_ROLLBACK_${tenantId}`, status: 'PENDING' }
      });
      throw new Error('DELIBERATE_ROLLBACK');
    });
  } catch (e: any) {
    if (e.message !== 'DELIBERATE_ROLLBACK') throw e;
  }
}

function calculatePercentiles(latencies: number[]) {
  if (latencies.length === 0) return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, max: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const p = (perc: number) => sorted[Math.floor((perc / 100) * (sorted.length - 1))];
  return {
    p50: p(50),
    p75: p(75),
    p90: p(90),
    p95: p(95),
    p99: p(99),
    max: sorted[sorted.length - 1]
  };
}

async function workerLoop(workerId: number) {
  const successLatencies: number[] = [];
  const failureLatencies: number[] = [];
  let fail = 0;
  
  for (let i = 0; i < ITERATIONS_PER_WORKER; i++) {
    const tenant = tenants[(workerId + i) % tenants.length];
    const opStart = Date.now();
    try {
      const type = i % 4;
      if (type === 0) await performRead(tenant.id);
      else if (type === 1) await performWrite(tenant.id);
      else if (type === 2) await performTransactionFailure(tenant.id);
      else await performRead(tenant.id);
      successLatencies.push(Date.now() - opStart);
    } catch (e: any) {
      if (e.message.includes('CROSS-TENANT')) {
         console.error(e.message);
         process.exit(1);
      }
      failureLatencies.push(Date.now() - opStart);
      fail++;
    }
  }
  
  return { successLatencies, failureLatencies, fail };
}

async function runBenchmark() {
  console.log('--- Setting up fixtures ---');
  await setupFixtures();
  
  for (const concurrency of CONCURRENCY_LEVELS) {
    console.log(`\n--- Running Concurrency: ${concurrency} ---`);
    const start = Date.now();
    
    const workers = [];
    for (let i = 0; i < concurrency; i++) workers.push(workerLoop(i));
    const results = await Promise.all(workers);
    const durationMs = Date.now() - start;
    
    const allSuccess = results.flatMap(r => r.successLatencies);
    const allFailure = results.flatMap(r => r.failureLatencies);
    const totalOps = allSuccess.length + allFailure.length;
    const tps = (totalOps / (durationMs / 1000)).toFixed(2);
    
    console.log(`Duration: ${durationMs}ms`);
    console.log(`Total Ops: ${totalOps}`);
    console.log(`Successful: ${allSuccess.length}`);
    console.log(`Failed (Timeouts): ${allFailure.length}`);
    console.log(`Throughput: ${tps} ops/sec`);
    
    const succP = calculatePercentiles(allSuccess);
    const failP = calculatePercentiles(allFailure);
    
    console.log('Success Latencies (ms):', succP);
    console.log('Failure Latencies (ms):', failP);
  }
}

runBenchmark().catch(console.error).finally(() => prisma.$disconnect());
