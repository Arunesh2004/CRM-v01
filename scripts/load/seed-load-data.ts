import { executeAsSystem, SystemOperation } from '../../database/utils/prisma-system';
import { nanoid } from 'nanoid';

async function seedLoadData() {
  console.log('--- Phase 11 Load Test Seeder ---');
  const tenantId = process.env.TEST_TENANT_ID || '11111111-1111-4111-8111-111111111111';
  
  await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
    // Ensure tenant exists
    await tx.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: {
        id: tenantId,
        name: 'Load Test Tenant',
        status: 'ACTIVE',
      },
    });

    const BATCH_SIZE = 1000;
    const TOTAL_TARGET = 10000;

    console.log(`Ensuring ${TOTAL_TARGET} customers/leads for tenant ${tenantId}...`);

    const currentCustomers = await tx.customer.count({ where: { tenantId } });
    
    if (currentCustomers < TOTAL_TARGET) {
      const toCreate = TOTAL_TARGET - currentCustomers;
      console.log(`Generating ${toCreate} Customers...`);
      
      for (let i = 0; i < toCreate; i += BATCH_SIZE) {
        const batchSize = Math.min(BATCH_SIZE, toCreate - i);
        const customers = Array.from({ length: batchSize }).map(() => {
          const id = nanoid();
          return {
            id,
            tenantId,
            name: `Load Customer ${id}`,
            normalizedName: `load-customer-${id}`,
            status: 'ACTIVE' as const,
          };
        });
        await tx.customer.createMany({ data: customers, skipDuplicates: true });
        process.stdout.write('.');
      }
      console.log(' Done.');
    } else {
      console.log('Customers already seeded.');
    }

    const currentLeads = await tx.lead.count({ where: { tenantId } });
    if (currentLeads < TOTAL_TARGET) {
      const toCreate = TOTAL_TARGET - currentLeads;
      console.log(`Generating ${toCreate} Leads...`);
      
      for (let i = 0; i < toCreate; i += BATCH_SIZE) {
        const batchSize = Math.min(BATCH_SIZE, toCreate - i);
        const leads = Array.from({ length: batchSize }).map(() => {
          const id = nanoid();
          return {
            id,
            tenantId,
            name: `Load Lead ${id}`,
            company: `Load Co ${id}`,
            email: `lead_${id}@load.test`,
            status: 'NEW' as const,
          };
        });
        await tx.lead.createMany({ data: leads, skipDuplicates: true });
        process.stdout.write('.');
      }
      console.log(' Done.');
    } else {
      console.log('Leads already seeded.');
    }

    const currentTasks = await tx.task.count({ where: { tenantId } });
    if (currentTasks < TOTAL_TARGET) {
      const toCreate = TOTAL_TARGET - currentTasks;
      console.log(`Generating ${toCreate} Tasks...`);
      
      const leads = await tx.lead.findMany({ where: { tenantId }, select: { id: true }, take: 1000 });
      
      for (let i = 0; i < toCreate; i += BATCH_SIZE) {
        const batchSize = Math.min(BATCH_SIZE, toCreate - i);
        const tasks = Array.from({ length: batchSize }).map((_, idx) => {
          const id = nanoid();
          const leadId = leads.length > 0 ? leads[(i + idx) % leads.length].id : undefined;
          return {
            id,
            tenantId,
            title: `Load Task ${id}`,
            status: 'PENDING' as const,
            priority: 'MEDIUM' as const,
            leadId,
          };
        });
        await tx.task.createMany({ data: tasks, skipDuplicates: true });
        process.stdout.write('.');
      }
      console.log(' Done.');
    } else {
      console.log('Tasks already seeded.');
    }
  });

  console.log('--- Seeding Complete ---');
  await globalPrisma.$disconnect();
}

seedLoadData().catch(e => {
  console.error(e);
  process.exit(1);
});
