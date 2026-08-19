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

    const adminEmails = ENV.initialAdminEmails;
    if (!adminEmails || adminEmails.length === 0) {
      throw new Error(`INITIAL_ADMIN_EMAIL is missing or empty`);
    }
    
    // Verify total expected admin count
    if (adminEmails.length < 2) {
      throw new Error(`Expected at least 2 admins configured, found ${adminEmails.length}: ${adminEmails.join(', ')}`);
    }

    console.log('\nSTAGING SEED VERIFICATION\n');

    const results = [];
    let allPass = true;

    for (let i = 0; i < adminEmails.length; i++) {
      const email = adminEmails[i];
      console.log(`Admin ${i + 1}:`);
      console.log(`${email}`);

      const user = await prisma.user.findFirst({
        where: { email },
        include: { userRoles: { include: { role: true } } }
      });

      let userPass = false;
      let tenantPass = false;
      let rolePass = false;
      let statusPass = false;
      let roleName = 'MISSING';

      if (user) {
        userPass = true;
        if (user.tenantId === tenant.id) {
          tenantPass = true;
        }
        if (user.status === 'INVITED' || user.status === 'ACTIVE') {
          statusPass = true;
        }
        const hasTenantAdmin = user.userRoles.some((ur: any) => ur.role.name === 'TENANT_ADMIN');
        if (hasTenantAdmin) {
          rolePass = true;
          roleName = 'TENANT_ADMIN';
        }
      }

      console.log(`User: ${userPass ? 'PASS' : 'FAIL'}`);
      console.log(`Tenant: ${tenantPass ? 'PASS' : 'FAIL'}`);
      console.log(`Role: ${rolePass ? roleName : 'FAIL'}`);
      console.log(`Status: ${statusPass ? 'PASS' : 'FAIL'}\n`);

      if (!userPass || !tenantPass || !rolePass || !statusPass) {
        allPass = false;
      }

      results.push({ email, userPass, tenantPass, rolePass, statusPass });
    }

    console.log(`Overall: ${allPass ? 'PASS' : 'FAIL'}`);

    if (!allPass) {
      throw new Error(`One or more admins failed verification.`);
    }

    const successResult = {
      success: true,
      tenantExists: true,
      adminsVerified: adminEmails.length,
      results,
      message: 'STAGING SEED VERIFICATION PASSED'
    };
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
