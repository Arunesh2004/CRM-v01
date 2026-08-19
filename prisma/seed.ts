import { PrismaClient } from '@prisma/client';
import { ENV } from '../src/lib/config/env';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING BOOTSTRAP ---');

  const tenantId = ENV.companyTenantId;
  
  if (!tenantId) {
    throw new Error('CRITICAL: COMPANY_TENANT_ID is not configured in the environment.');
  }

  // Idempotent Tenant Creation
  const tenant = await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {}, // Do nothing if it already exists
    create: {
      id: tenantId,
      name: 'Canonical Company',
      status: 'ACTIVE',
    },
  });
  console.log(`Verified Canonical Tenant: ${tenant.id}`);

  // Ensure necessary global roles exist within the canonical tenant
  const roles = ['TENANT_ADMIN', 'DEPARTMENT_HEAD', 'MEMBER'];
  
  for (const roleName of roles) {
    const role = await prisma.role.findFirst({
      where: { name: roleName, tenantId: tenant.id },
    });
    
    if (!role) {
      await prisma.role.create({
        data: {
          name: roleName,
          tenantId: tenant.id,
        },
      });
      console.log(`Created required role: ${roleName}`);
    } else {
      console.log(`Verified role exists: ${roleName}`);
    }
  }

  // Seed initial administrators
  const adminEmails = ENV.initialAdminEmails;
  if (adminEmails && adminEmails.length > 0) {
    for (const adminEmail of adminEmails) {
      const adminUser = await prisma.user.upsert({
        where: {
          tenantId_email: { tenantId: tenant.id, email: adminEmail }
        },
        update: {}, // Idempotent: don't overwrite if exists
        create: {
          email: adminEmail,
          tenantId: tenant.id,
          status: 'INVITED',
          onboardingStatus: 'PENDING',
          firstName: 'System',
          lastName: 'Administrator',
        }
      });
      console.log(`Verified Admin User exists: ${adminUser.email}`);

      // Fetch TENANT_ADMIN role and link to adminUser
      const adminRole = await prisma.role.findFirst({
        where: { name: 'TENANT_ADMIN', tenantId: tenant.id }
      });

      if (adminRole) {
        await prisma.userRole.upsert({
          where: {
            userId_roleId: { userId: adminUser.id, roleId: adminRole.id }
          },
          update: {},
          create: {
            userId: adminUser.id,
            roleId: adminRole.id
          }
        });
        console.log(`Verified Admin User has TENANT_ADMIN role: ${adminEmail}`);
      } else {
        console.error(`ERROR: Could not find TENANT_ADMIN role to assign to ${adminEmail}`);
      }
    }
  } else {
    console.log('NOTICE: INITIAL_ADMIN_EMAIL not set. Skipping admin user creation.');
  }

  console.log('--- BOOTSTRAP COMPLETE ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
