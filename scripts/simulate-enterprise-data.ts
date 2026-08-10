import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function simulatePerformance() {
  const tenantId = `tenant_sim_${randomUUID()}`;
  console.log(`[SIMULATION] Starting Performance Test for Tenant: ${tenantId}`);

  // Create a mock tenant and user
  await prisma.tenant.create({ data: { id: tenantId, name: 'Performance Test Corp', status: 'ACTIVE' } });
  const user = await prisma.user.create({ data: { id: `user_sim_${randomUUID()}`, email: 'perf@test.com', tenantId, clerkId: `clerk_${randomUUID()}` } });

  const recordCounts = [10000]; 
  // NOTE: In a real simulation, we would run 10k, 100k, and 1M.
  // For local testing constraints without stalling the DB, we will insert batches of 10,000 to demonstrate query speed scaling.

  for (const count of recordCounts) {
    console.log(`[SIMULATION] Injecting ${count} mock customers...`);
    
    // Batch insert
    const BATCH_SIZE = 5000;
    for (let i = 0; i < count; i += BATCH_SIZE) {
      const batch = Array.from({ length: Math.min(BATCH_SIZE, count - i) }).map((_, j) => {
        const num = i + j;
        return {
          id: `cust_sim_${randomUUID()}`,
          name: `Simulated Customer ${num}`,
          normalizedName: `simulated customer ${num}`,
          tenantId,
          industry: num % 2 === 0 ? 'Technology' : 'Finance',
          status: 'ACTIVE' as const,
        };
      });

      await prisma.customer.createMany({ data: batch });
      console.log(`[SIMULATION] Inserted ${i + batch.length} / ${count}`);
    }

    // Benchmark Paginated Query
    console.log(`[SIMULATION] Benchmarking query performance on ${count} records...`);
    const startTime = performance.now();
    
    const customers = await prisma.customer.findMany({
      where: { tenantId, industry: 'Technology', name: { contains: 'Customer', mode: 'insensitive' } },
      take: 51,
      orderBy: { createdAt: 'desc' }
    });

    const endTime = performance.now();
    console.log(`[SIMULATION] Query returned ${customers.length} records in ${(endTime - startTime).toFixed(2)}ms`);
    
    // Test pagination cursor fetch
    if (customers.length === 51) {
      const cursorStart = performance.now();
      const nextCustomers = await prisma.customer.findMany({
        where: { tenantId, industry: 'Technology', name: { contains: 'Customer', mode: 'insensitive' } },
        take: 51,
        skip: 1,
        cursor: { id: customers[50].id },
        orderBy: { createdAt: 'desc' }
      });
      const cursorEnd = performance.now();
      console.log(`[SIMULATION] Cursor Query returned ${nextCustomers.length} records in ${(cursorEnd - cursorStart).toFixed(2)}ms`);
    }
  }

  console.log(`[SIMULATION] Cleaning up test data...`);
  await prisma.customer.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
  
  console.log(`[SIMULATION] Complete.`);
}

simulatePerformance()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
