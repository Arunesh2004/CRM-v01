import { PrismaClient } from '@prisma/client';
import { getCustomerTimeline } from '../src/modules/crm/customer/customer.timeline.service';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function run() {
  console.log('Starting R.14.1 Unified Timeline Verification...');
  
  // 1. Fetch any existing tenant, user, customer
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.log('No tenant found. Aborting.');
    return;
  }
  const user = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
  if (!user) {
    console.log('No user found. Aborting.');
    return;
  }

  // Create a dedicated test customer
  const customer = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: `Performance Test Customer ${Date.now()}`,
      normalizedName: `perftest-${Date.now()}`,
      assignedUserId: user.id
    }
  });

  console.log(`Created test customer: ${customer.id}. Injecting 10,000 activities...`);

  // Insert 10,000 activities in chunks to avoid blowing up memory
  const CHUNK_SIZE = 1000;
  for (let i = 0; i < 10; i++) {
    const data = Array.from({ length: CHUNK_SIZE }).map((_, idx) => ({
      tenantId: tenant.id,
      type: idx % 2 === 0 ? 'NOTE' as const : 'SYSTEM' as const,
      content: `Performance test activity ${i * CHUNK_SIZE + idx}`,
      actorId: user.id,
      entityType: 'CUSTOMER' as const,
      entityId: customer.id,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)) // Random past date
    }));
    await prisma.activityTimeline.createMany({ data });
    process.stdout.write(`Inserted chunk ${i + 1}/10... `);
  }
  console.log('\nData injection complete.');

  // Mock requireAuth/requireTenant globally for this test scope
  (global as any).mockRequireAuth = () => ({ id: user.id });
  (global as any).mockRequireTenant = () => tenant.id;
  (global as any).mockRequirePermission = () => true;

  // We need to patch the lib/auth for this test script without modifying actual code.
  // Easiest is just to copy the logic of the service but scoped purely to our DB call to test DB performance,
  // because Next.js headers() will fail in a plain node script.
  
  console.log('Testing query performance...');
  
  const startTime = performance.now();
  
  // Execute the exact same queries the service does
  const tasks = await prisma.task.findMany({
    where: { tenantId: tenant.id, customerId: customer.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 200
  });

  const activities = await prisma.activityTimeline.findMany({
    where: { tenantId: tenant.id, entityType: 'CUSTOMER', entityId: customer.id },
    orderBy: { createdAt: 'desc' },
    take: 200
  });

  const calls = await prisma.call.findMany({
    where: {
      tenantId: tenant.id,
      deletedAt: null,
      participants: { some: { contact: { customerId: customer.id } } }
    },
    orderBy: { createdAt: 'desc' },
    take: 200
  });

  const emailThreads = await prisma.emailThread.findMany({
    where: { tenantId: tenant.id, customerId: customer.id },
    take: 20
  });

  const conversations = await prisma.conversation.findMany({
    where: { 
      tenantId: tenant.id, 
      customerId: customer.id, 
      deletedAt: null,
      type: { notIn: ['INTERNAL_DIRECT', 'INTERNAL_GROUP', 'INTERNAL_CHANNEL'] }
    },
    take: 20
  });

  const endTime = performance.now();
  const duration = (endTime - startTime).toFixed(2);
  
  console.log(`Query execution time for 10,000 row simulation: ${duration}ms`);
  
  if (parseFloat(duration) < 500) {
    console.log('✅ Performance Benchmark Passed (<500ms)');
  } else {
    console.log('⚠️ Performance Benchmark Failed (>500ms)');
  }

  // Cleanup
  await prisma.activityTimeline.deleteMany({ where: { entityId: customer.id } });
  await prisma.customer.delete({ where: { id: customer.id } });
  console.log('Cleanup complete.');
}

run().catch(console.error).finally(() => prisma.$disconnect());
