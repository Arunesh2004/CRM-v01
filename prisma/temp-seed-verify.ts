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
  execSync('npx prisma db seed', { stdio: 'inherit' });

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

    const successResult = {
      success: true,
      tenantExists: true,
      userExists: true,
      userStatus: user.status,
      hasTenantAdmin: true,
      message: 'STAGING SEED VERIFICATION PASSED'
    };
    console.log(successResult.message);
    require('fs').writeFileSync('public/seed-result.json', JSON.stringify(successResult, null, 2));

  } catch (error: any) {
    console.error('VERIFICATION FAILED:', error);
    const failureResult = {
      success: false,
      message: error.message,
      stack: error.stack
    };
    require('fs').writeFileSync('public/seed-result.json', JSON.stringify(failureResult, null, 2));
    // DO NOT process.exit(1) so the build can succeed and we can inspect the JSON
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: any) => {
  console.error(e);
  const failureResult = { success: false, message: e.message, stack: e.stack };
  require('fs').writeFileSync('public/seed-result.json', JSON.stringify(failureResult, null, 2));
});
