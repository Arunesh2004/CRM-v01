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
