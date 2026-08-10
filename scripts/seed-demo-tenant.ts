import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Demo Tenant Seeding...');

  // 1. Create Acme Security Solutions Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Acme Security Solutions',
      status: 'ACTIVE',
      rpoPolicy: 'ENTERPRISE'
    }
  });

  console.log(`Created Tenant: ${tenant.name} (${tenant.id})`);

  // 2. Create Users
  const users = await Promise.all([
    prisma.user.create({ data: { tenantId: tenant.id, email: 'admin@demo.com', clerkId: `clerk_${crypto.randomBytes(4).toString('hex')}`, status: 'ACTIVE' } }),
    prisma.user.create({ data: { tenantId: tenant.id, email: 'manager@demo.com', clerkId: `clerk_${crypto.randomBytes(4).toString('hex')}`, status: 'ACTIVE' } }),
    prisma.user.create({ data: { tenantId: tenant.id, email: 'sales1@demo.com', clerkId: `clerk_${crypto.randomBytes(4).toString('hex')}`, status: 'ACTIVE' } }),
    prisma.user.create({ data: { tenantId: tenant.id, email: 'sales2@demo.com', clerkId: `clerk_${crypto.randomBytes(4).toString('hex')}`, status: 'ACTIVE' } }),
  ]);
  console.log('Created Users');

  // 3. Create Pipeline and Stages
  const pipeline = await prisma.pipeline.create({
    data: {
      tenantId: tenant.id,
      name: 'Enterprise Sales',
      isDefault: true,
      stages: {
        create: [
          { tenantId: tenant.id, name: 'Lead In', order: 0, probability: 10 },
          { tenantId: tenant.id, name: 'Meeting Scheduled', order: 1, probability: 20 },
          { tenantId: tenant.id, name: 'Proposal', order: 2, probability: 50 },
          { tenantId: tenant.id, name: 'Negotiation', order: 3, probability: 80 },
          { tenantId: tenant.id, name: 'Closed Won', order: 4, probability: 100, isClosedWon: true },
          { tenantId: tenant.id, name: 'Closed Lost', order: 5, probability: 0, isClosedLost: true },
        ]
      }
    },
    include: { stages: true }
  });

  // 4. Create Customers (100)
  console.log('Creating 100 Customers...');
  const customerData = Array.from({ length: 100 }).map((_, i) => ({
    tenantId: tenant.id,
    name: `Demo Customer ${i + 1}`,
    normalizedName: `demo_customer_${i + 1}`,
    industry: i % 2 === 0 ? 'Technology' : 'Finance',
    assignedUserId: users[i % users.length].id
  }));
  await prisma.customer.createMany({ data: customerData });
  const customers = await prisma.customer.findMany({ where: { tenantId: tenant.id } });

  // 5. Create Leads (200)
  console.log('Creating 200 Leads...');
  const leadData = Array.from({ length: 200 }).map((_, i) => ({
    tenantId: tenant.id,
    name: `Demo Lead ${i + 1}`,
    company: `Prospect Corp ${i + 1}`,
    email: `lead${i}@prospect.com`,
    status: 'NEW' as any,
    assignedUserId: users[i % users.length].id
  }));
  await prisma.lead.createMany({ data: leadData });

  // 6. Create Deals (100)
  console.log('Creating 100 Deals...');
  const activeStage = pipeline.stages[2].id;
  const dealData = Array.from({ length: 100 }).map((_, i) => ({
    tenantId: tenant.id,
    title: `Enterprise Security Upgrade Q${(i % 4) + 1}`,
    value: 50000 + (Math.random() * 100000),
    customerId: customers[i].id,
    pipelineId: pipeline.id,
    stageId: activeStage,
    assignedUserId: users[i % users.length].id,
    status: 'OPEN' as any
  }));
  await prisma.deal.createMany({ data: dealData });

  // 7. Create 200 Calls (Communication Realism)
  console.log('Creating 200 Calls...');
  const callData = Array.from({ length: 200 }).map((_, i) => ({
    tenantId: tenant.id,
    providerId: `demo_call_${i}`,
    direction: i % 2 === 0 ? 'INBOUND' as any : 'OUTBOUND' as any,
    status: 'COMPLETED' as any,
    durationSeconds: 120 + Math.floor(Math.random() * 600),
    startedAt: new Date(Date.now() - Math.random() * 10000000000),
  }));
  await prisma.call.createMany({ data: callData });
  // (Participants would normally be created here too, but skipped for brevity in massive seed)

  // 8. Create Messages (5000)
  console.log('Creating 5000 Chat Messages...');
  // First create a Conversation
  const conversation = await prisma.conversation.create({
    data: {
      tenantId: tenant.id,
      type: 'INTERNAL_CHANNEL',
      name: 'Sales General',
      members: {
        create: users.map(u => ({ tenantId: tenant.id, userId: u.id, role: 'MEMBER' }))
      }
    }
  });

  // Batch insert 5000 messages
  const messageBatches = [];
  for (let i = 0; i < 50; i++) {
    const batch = Array.from({ length: 100 }).map((_, j) => ({
      tenantId: tenant.id,
      conversationId: conversation.id,
      senderId: users[(i + j) % users.length].id,
      content: `Simulated demo message ${(i * 100) + j}`,
      type: 'TEXT' as any,
      createdAt: new Date(Date.now() - ((5000 - ((i * 100) + j)) * 60000))
    }));
    messageBatches.push(prisma.message.createMany({ data: batch }));
  }
  await Promise.all(messageBatches);

  console.log('✅ Demo Environment Successfully Seeded!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
