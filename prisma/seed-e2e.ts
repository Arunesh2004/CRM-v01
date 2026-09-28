import { PrismaClient, Resource, Action } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING E2E BOOTSTRAP ---');

  const tenantAId = '00000000-0000-4000-8000-00000000000a';
  const tenantBId = '00000000-0000-4000-8000-00000000000b';

  // Create Tenants
  await prisma.tenant.upsert({
    where: { id: tenantAId },
    update: {},
    create: { id: tenantAId, name: 'Tenant A E2E', status: 'ACTIVE' },
  });
  
  await prisma.tenant.upsert({
    where: { id: tenantBId },
    update: {},
    create: { id: tenantBId, name: 'Tenant B E2E', status: 'ACTIVE' },
  });

  // Create Roles
  for (const tenantId of [tenantAId, tenantBId]) {
    for (const roleName of ['TENANT_ADMIN', 'MEMBER']) {
      const existing = await prisma.role.findFirst({
        where: { name: roleName, tenantId }
      });
      if (!existing) {
        await prisma.role.create({ data: { name: roleName, tenantId } });
      }
    }
  }

  // Create E2E Users
  const users = [
    {
      id: '00000000-0000-4000-8000-000000000001',
      email: 'audit-load-admin-a@test.local',
      tenantId: tenantAId,
      role: 'TENANT_ADMIN'
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      email: 'audit-load-emp-a@test.local',
      tenantId: tenantAId,
      role: 'MEMBER'
    },
    {
      id: '00000000-0000-4000-8000-000000000003',
      email: 'audit-load-emp-b@test.local',
      tenantId: tenantBId,
      role: 'MEMBER'
    }
  ];

  for (const u of users) {
    const existingUser = await prisma.user.findFirst({
      where: { email: u.email }
    });
    
    let userId = existingUser?.id;
    if (!existingUser) {
      const user = await prisma.user.create({
        data: {
          id: u.id,
          email: u.email,
          tenantId: u.tenantId,
          status: 'ACTIVE',
          onboardingStatus: 'COMPLETED',
          firstName: 'Test',
          lastName: u.role,
        }
      });
      userId = user.id;
    }

    const role = await prisma.role.findFirst({ where: { name: u.role, tenantId: u.tenantId } });
    if (role && userId) {
      const existingUserRole = await prisma.userRole.findFirst({
        where: { userId, roleId: role.id }
      });
      if (!existingUserRole) {
        await prisma.userRole.create({
          data: { userId, roleId: role.id, tenantId: u.tenantId }
        });
      }
    }
  }

  // Create Chat Conversation between Admin A and Emp A
  const existingConv = await prisma.chatConversation.findFirst({
    where: {
      tenantId: tenantAId,
      type: 'DIRECT',
    }
  });

  if (!existingConv) {
    await prisma.chatConversation.create({
      data: {
        tenantId: tenantAId,
        type: 'DIRECT',
        participants: {
          create: [
            { tenantId: tenantAId, userId: '00000000-0000-4000-8000-000000000001', role: 'MEMBER' },
            { tenantId: tenantAId, userId: '00000000-0000-4000-8000-000000000002', role: 'MEMBER' }
          ]
        }
      }
    });
  }

  console.log('--- E2E BOOTSTRAP COMPLETE ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
