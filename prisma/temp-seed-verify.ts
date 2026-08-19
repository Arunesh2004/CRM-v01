import { PrismaClient } from '@prisma/client';
import { ENV } from '../src/lib/config/env';

async function main() {
  if (process.env.VERCEL_ENV !== 'preview') {
    console.log('Skipping seed verification: not in preview environment.');
    return;
  }

  console.log('--- STARTING PREVIEW SEED EXECUTION AND VERIFICATION ---');

  // We explicitly run the seed logic here since prisma migrate deploy does not run it automatically.
  // We do it by executing the seed script.
  console.log('Executing prisma/seed.ts...');
  const { execSync } = require('child_process');
  execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });

  console.log('--- SEED EXECUTION FINISHED, VERIFYING DATABASE STATE ---');

  const prisma = new PrismaClient();

  try {
    const tenantId = ENV.companyTenantId;
    if (!tenantId) {
      throw new Error('COMPANY_TENANT_ID is missing');
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} is missing`);
    }

    const adminEmail = ENV.initialAdminEmail;
    if (!adminEmail || adminEmail !== 'aruneshsharma2004@gmail.com') {
      throw new Error(`INITIAL_ADMIN_EMAIL is missing or not aruneshsharma2004@gmail.com, got: ${adminEmail}`);
    }

    const user = await prisma.user.findFirst({
      where: { email: adminEmail },
      include: { userRoles: { include: { role: true } } }
    });

    if (!user) {
      throw new Error(`User ${adminEmail} is missing`);
    }

    if (user.tenantId !== tenant.id) {
      throw new Error(`User ${adminEmail} has wrong tenantId: ${user.tenantId}`);
    }

    const hasTenantAdmin = user.userRoles.some((ur: any) => ur.role.name === 'TENANT_ADMIN');
    if (!hasTenantAdmin) {
      throw new Error(`User ${adminEmail} does not have TENANT_ADMIN role`);
    }

    console.log('STAGING SEED VERIFICATION PASSED');
    console.log(`Tenant exists: true`);
    console.log(`User exists: true`);
    console.log(`User status: ${user.status}`);
    console.log(`TENANT_ADMIN role exists: true`);

  } catch (error) {
    console.error('VERIFICATION FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
