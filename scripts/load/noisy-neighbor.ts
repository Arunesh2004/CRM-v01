import { executeAsSystem } from '../../database/utils/prisma-system';
import { withTenant, withTenantTransaction } from '../../database/utils/prisma-tenant';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const globalPrisma = new PrismaClient();

async function simulateCRMWorkload(tenantId: string, durationMs: number) {
  const tenantPrisma = withTenant(tenantId);
  const end = Date.now() + durationMs;
  let ops = 0;
  while (Date.now() < end) {
    // Basic read
    await tenantPrisma.customer.findMany({ take: 10 });
    // Basic write
    await tenantPrisma.$transaction(async (tx) => {
      const scopedTx = await withTenantTransaction(tx, tenantId);
      await scopedTx.task.create({
        data: {
          tenantId,
          title: `Noise Task ${crypto.randomUUID()}`,
          status: 'PENDING'
        }
      });
    });
    ops++;
  }
  return ops;
}

async function simulateExportWorkload(tenantId: string, durationMs: number) {
  const tenantPrisma = withTenant(tenantId);
  const end = Date.now() + durationMs;
  let ops = 0;
  while (Date.now() < end) {
    // Heavy read
    await tenantPrisma.customer.findMany({
      take: 5000,
      orderBy: { createdAt: 'desc' }
    });
    ops++;
  }
  return ops;
}

async function runNoisyNeighborTest() {
  console.log('--- Phase 11 Noisy Neighbor Load Test ---');
  const tenantA = crypto.randomUUID();
  const tenantB = crypto.randomUUID();

  const { SystemOperation } = await import('../../database/utils/prisma-system');
  await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
    await tx.tenant.createMany({
      data: [
        { id: tenantA, name: 'Heavy Exporter Tenant', status: 'ACTIVE' },
        { id: tenantB, name: 'Normal CRM Tenant', status: 'ACTIVE' }
      ]
    });
    // Seed some data for Export Tenant
    const customers = Array.from({ length: 5000 }).map(() => ({
      id: crypto.randomUUID(),
      tenantId: tenantA,
      name: `Heavy Cust ${crypto.randomUUID()}`,
      normalizedName: crypto.randomUUID(),
      status: 'ACTIVE' as const
    }));
    await tx.customer.createMany({ data: customers });
  });

  console.log('Baseline CRM Throughput (No noise)...');
  const baselineOps = await simulateCRMWorkload(tenantB, 5000); // 5 seconds
  console.log(`Baseline CRM Ops (5s): ${baselineOps} (${baselineOps/5} ops/sec)`);

  console.log('Running Mixed Workload (Tenant A Exporting, Tenant B CRM)...');
  const start = Date.now();
  const [exportOps, crmOps] = await Promise.all([
    simulateExportWorkload(tenantA, 5000),
    simulateCRMWorkload(tenantB, 5000)
  ]);
  
  console.log(`Export Ops (5s): ${exportOps}`);
  console.log(`CRM Ops Under Load (5s): ${crmOps} (${crmOps/5} ops/sec)`);

  const degradation = ((baselineOps - crmOps) / baselineOps) * 100;
  console.log(`CRM Degradation: ${degradation.toFixed(2)}%`);

  if (degradation > 80) {
    console.log('FAIL: Noisy neighbor caused unacceptable degradation (>80%). Backpressure/connection pooling insufficient.');
    process.exit(1);
  } else {
    console.log('PASS: Acceptable isolation between tenants.');
  }

  await globalPrisma.$disconnect();
}

runNoisyNeighborTest().catch(console.error);
