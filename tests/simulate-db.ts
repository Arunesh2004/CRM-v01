import { PrismaClient } from '@prisma/client';

async function simulateWebhookPrisma() {
  const prisma = new PrismaClient();
  
  try {
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Default Workspace',
        status: 'ACTIVE'
      }
    });

    const user = await prisma.user.create({
      data: {
        clerkId: 'user_2xyztest123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: tenant.id,
        role: 'OWNER'
      }
    });

    console.log(`✔ Success! User ${user.firstName} created and bound to Tenant ID: ${user.tenantId}`);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

simulateWebhookPrisma();
