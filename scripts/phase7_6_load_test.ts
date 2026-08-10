import { PrismaClient } from '@prisma/client';
// Remove uuid to avoid install requirements

const prisma = new PrismaClient();

async function runLoadTest() {
  console.log('Starting Phase 7.6 Load Test Simulation...');

  // Using a test tenant
  const tenantId = 'TEST_LOAD_TENANT_' + Date.now();

  try {
    console.log('1. Creating test tenant...');
    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Load Test Corp',
        rpoPolicy: 'BASIC' as any,
      }
    });

    console.log('2. Inserting 10,000 Customers (Batch)...');
    const customers = Array.from({ length: 10000 }).map((_, i) => ({
      tenantId,
      name: `Customer ${i}`,
      normalizedName: `customer ${i}`,
      status: 'ACTIVE' as any
    }));
    const customerStart = performance.now();
    await prisma.customer.createMany({ data: customers });
    const customerEnd = performance.now();
    console.log(`✅ 10,000 Customers inserted in ${(customerEnd - customerStart).toFixed(2)}ms`);

    console.log('3. Inserting 10,000 Leads (Batch)...');
    const leads = Array.from({ length: 10000 }).map((_, i) => ({
      tenantId,
      name: `Lead ${i}`,
      title: `Lead ${i}`,
      company: `Corp ${i}`,
      status: 'NEW' as any,
    }));
    const leadStart = performance.now();
    await prisma.lead.createMany({ data: leads });
    const leadEnd = performance.now();
    console.log(`✅ 10,000 Leads inserted in ${(leadEnd - leadStart).toFixed(2)}ms`);

    console.log('4. Querying massive dataset (Simulating Dashboard)...');
    const queryStart = performance.now();
    
    // Simulating getDashboardMetricsAction
    const [customerCount, leadCount] = await Promise.all([
      prisma.customer.count({ where: { tenantId } }),
      prisma.lead.count({ where: { tenantId } })
    ]);
    
    const queryEnd = performance.now();
    console.log(`✅ Dashboard aggregations completed in ${(queryEnd - queryStart).toFixed(2)}ms`);
    console.log(`Results: ${customerCount} Customers, ${leadCount} Leads`);

    console.log('5. Cleaning up load test data...');
    // Cascade delete via tenant
    await prisma.tenant.delete({ where: { id: tenantId } });
    console.log('✅ Cleanup complete.');

  } catch (error) {
    console.error('❌ Load test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runLoadTest();
