import crypto from 'crypto';
import { enforceDemoSafetyGuard } from './utils/demo-safety';
import { executeAsSystem, SystemOperation } from '../database/utils/prisma-system';

export async function seedDemoTenant(tenantId: string, demoRoleId: string) {
  // Ensure the safety guard runs if it wasn't run already by the caller
  enforceDemoSafetyGuard();

  console.log(`[Seed] Starting Demo Tenant Seeding for Tenant ID: ${tenantId}...`);

  await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
    // Verify the tenant exists
    const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new Error(`[Seed] Fatal: Tenant with ID ${tenantId} not found.`);
    }

    // Verify demoRoleId belongs to this tenant and is named exactly 'DEMO_USER'
    const demoRole = await tx.role.findFirst({
      where: { id: demoRoleId, tenantId }
    });

    if (!demoRole || demoRole.name !== 'DEMO_USER') {
      throw new Error(`[Seed] Fatal: Provided role is not named DEMO_USER or does not belong to the target tenant.`);
    }

    // Seed Users
    const userEmails = ['admin@demo.com', 'manager@demo.com', 'sales1@demo.com', 'sales2@demo.com'];
    const users = [];

    for (const email of userEmails) {
      const user = await tx.user.upsert({
        where: { tenantId_email: { tenantId, email } },
        update: { status: 'ACTIVE' },
        create: {
          tenantId,
          email,
          clerkId: `clerk_${crypto.randomBytes(4).toString('hex')}`,
          status: 'ACTIVE'
        }
      });

      // Ensure the user receives the DEMO_USER role specifically
      await tx.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: demoRole.id } },
        update: {},
        create: {
          userId: user.id,
          roleId: demoRole.id,
          tenantId
        }
      });

      users.push(user);
    }
    console.log('[Seed] Users explicitly assigned DEMO_USER role.');

    // Pipeline (Find or Create)
    let pipeline = await tx.pipeline.findFirst({
      where: { tenantId, name: 'Enterprise Sales' },
      include: { stages: true }
    });

    if (!pipeline) {
      pipeline = await tx.pipeline.create({
        data: {
          tenantId,
          name: 'Enterprise Sales',
          isDefault: true,
          stages: {
            create: [
              { tenantId, name: 'Lead In', order: 0, probability: 10 },
              { tenantId, name: 'Meeting Scheduled', order: 1, probability: 20 },
              { tenantId, name: 'Proposal', order: 2, probability: 50 },
              { tenantId, name: 'Negotiation', order: 3, probability: 80 },
              { tenantId, name: 'Closed Won', order: 4, probability: 100, isClosedWon: true },
              { tenantId, name: 'Closed Lost', order: 5, probability: 0, isClosedLost: true },
            ]
          }
        },
        include: { stages: true }
      });
    }

    // Customers
    console.log('[Seed] Seeding Customers...');
    for (let i = 0; i < 100; i++) {
      const normalizedName = `demo_customer_${i + 1}`;
      await tx.customer.upsert({
        where: { tenantId_normalizedName: { tenantId, normalizedName } },
        update: {},
        create: {
          tenantId,
          name: `Demo Customer ${i + 1}`,
          normalizedName,
          industry: i % 2 === 0 ? 'Technology' : 'Finance',
          assignedUserId: users[i % users.length].id
        }
      });
    }
    const customers = await tx.customer.findMany({ where: { tenantId } });

    // Leads
    console.log('[Seed] Seeding Leads...');
    for (let i = 0; i < 200; i++) {
      const email = `lead${i}@prospect.com`;
      await tx.lead.upsert({
        where: { tenantId_email: { tenantId, email } },
        update: {},
        create: {
          tenantId,
          name: `Demo Lead ${i + 1}`,
          company: `Prospect Corp ${i + 1}`,
          email,
          status: 'NEW',
          assignedUserId: users[i % users.length].id
        }
      });
    }

    // Deals
    console.log('[Seed] Seeding Deals...');
    const activeStage = pipeline.stages.find(s => s.name === 'Proposal')?.id || pipeline.stages[2].id;
    for (let i = 0; i < 100; i++) {
      const title = `Enterprise Security Upgrade Q${(i % 4) + 1}`;
      const customerId = customers[i].id;
      
      const existingDeal = await tx.deal.findFirst({
        where: { tenantId, customerId, title }
      });

      if (!existingDeal) {
        await tx.deal.create({
          data: {
            tenant: { connect: { id: tenantId } },
            title,
            value: 50000 + (Math.random() * 100000),
            customer: { connect: { id: customerId } },
            pipeline: { connect: { id: pipeline.id } },
            stage: { connect: { id: activeStage } },
            assignedUser: { connect: { id: users[i % users.length].id } },
            createdUser: { connect: { id: users[i % users.length].id } },
            status: 'OPEN'
          }
        });
      }
    }

    // Calls
    console.log('[Seed] Seeding Calls...');
    for (let i = 0; i < 200; i++) {
      const providerCallId = `demo_call_${i}`;
      const existingCall = await tx.callLog.findFirst({
        where: { tenantId, providerCallId }
      });
      if (!existingCall) {
        await tx.callLog.create({
          data: {
            tenant: { connect: { id: tenantId } },
            providerCallId,
            provider: 'EXTERNAL',
            status: 'COMPLETED',
            duration: 120 + Math.floor(Math.random() * 600),
          }
        });
      }
    }

    // Conversation & Messages
    console.log('[Seed] Seeding Conversation & Messages...');
    let conversation = await tx.chatConversation.findFirst({
      where: { tenantId, name: 'Sales General' }
    });

    if (!conversation) {
      conversation = await tx.chatConversation.create({
        data: {
          tenant: { connect: { id: tenantId } },
          type: 'GROUP',
          name: 'Sales General',
          participants: {
            create: users.map(u => ({ tenantId, userId: u.id, role: 'MEMBER' }))
          }
        }
      });

      const messageBatches = [];
      for (let i = 0; i < 50; i++) {
        const batch = Array.from({ length: 100 }).map((_, j) => ({
          tenantId,
          conversationId: conversation!.id,
          senderId: users[(i + j) % users.length].id,
          content: `Simulated demo message ${(i * 100) + j}`,
          createdAt: new Date(Date.now() - ((5000 - ((i * 100) + j)) * 60000))
        }));
        messageBatches.push(tx.chatMessage.createMany({ data: batch, skipDuplicates: true }));
      }
      await Promise.all(messageBatches);
    }
  });

  console.log('[Seed] ✅ Demo Environment Successfully Seeded!');
}
