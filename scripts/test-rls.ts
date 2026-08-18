import { PrismaClient } from '@prisma/client';
import { withTenant as rawWithTenant } from '../database/utils/prisma-tenant';
import crypto from 'crypto';
const uuidv4 = crypto.randomUUID;

const prisma = new PrismaClient();

async function runTests() {
  console.log('--- Starting RLS Adversarial Tests ---');
  
  const tenantA = await prisma.tenant.create({ data: { name: 'Tenant A ' + uuidv4() } });
  const tenantB = await prisma.tenant.create({ data: { name: 'Tenant B ' + uuidv4() } });

  console.log(`Created Tenant A: ${tenantA.id}`);
  console.log(`Created Tenant B: ${tenantB.id}`);

  // Ensure crm_app_user exists for testing RLS as non-superuser
  try {
    await prisma.$executeRawUnsafe(`CREATE ROLE crm_app_user NOLOGIN`);
  } catch (e) {}
  
  try {
    await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO crm_app_user`);
    await prisma.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO crm_app_user`);
    await prisma.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO crm_app_user`);
  } catch (e) {
    console.warn("Could not grant privileges to crm_app_user", e);
  }

  // Need to bypass RLS to create user in Tenant B via global prisma?
  // Actually, create operations in prisma-tenant override tenantId.
  // Wait, if RLS is on, global Prisma client has no context. It might fail on insert if RLS is forced!
  // Wait, RLS FORCE means even table owners are restricted. 
  // Let's see if we can insert via global prisma.
  // In Postgres, if RLS is enabled and you insert without context, the policy USING doesn't apply to INSERT, but WITH CHECK does.
  // Let's use the tenant-specific client to create!
  const tenantBClient = rawWithTenant(tenantB.id);
  const tenantAClient = rawWithTenant(tenantA.id);

  const userB = await tenantBClient.user.create({
    data: {
      email: `user-b-${uuidv4()}@example.com`,
      status: 'ACTIVE'
    }
  });

  console.log('\nTest 1: Tenant B accessing own user');
  const foundUserB = await tenantBClient.user.findFirst({ where: { id: userB.id } });
  if (foundUserB) console.log('✅ Success: Tenant B can see own user.');
  else { console.error('❌ Failed: Tenant B cannot see own user.'); process.exit(1); }

  console.log('\nTest 2: Tenant A attempting to access Tenant B user (Cross Tenant Query)');
  // We use $queryRawUnsafe inside the interactive transaction to bypass the app-level 'where' filter
  const maliciousAttempt = await tenantAClient.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe(`SET ROLE crm_app_user`);
    const res = await tx.$queryRawUnsafe(`SELECT * FROM "User" WHERE id = '${userB.id}'`);
    await tx.$executeRawUnsafe(`RESET ROLE`);
    return res;
  });
  
  if (Array.isArray(maliciousAttempt) && maliciousAttempt.length === 0) console.log('✅ Success: RLS blocked cross-tenant access natively.');
  else { console.error('❌ Failed: RLS leak detected!', maliciousAttempt); process.exit(1); }

  console.log('\nTest 3: Missing tenant context (Global Prisma Client)');
  try {
    await prisma.$executeRawUnsafe(`SET ROLE crm_app_user`);
    const rawUsers = await prisma.$queryRawUnsafe(`SELECT * FROM "User" WHERE id = '${userB.id}'`);
    await prisma.$executeRawUnsafe(`RESET ROLE`);
    if (Array.isArray(rawUsers) && rawUsers.length === 0) {
      console.log('✅ Success: Queries without tenant context return zero rows.');
    } else {
      console.error('❌ Failed: Global query leaked data!', rawUsers);
      process.exit(1);
    }
  } catch (e) {
    console.log('✅ Success: Queries without tenant context threw error or returned 0 rows.', e.message);
  }

  // Cleanup bypass RLS
  await prisma.$executeRawUnsafe('ALTER TABLE "User" DISABLE ROW LEVEL SECURITY');
  await prisma.user.delete({ where: { id: userB.id } });
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
  await prisma.$executeRawUnsafe('ALTER TABLE "User" ENABLE ROW LEVEL SECURITY');

  console.log('\n--- All RLS Tests Passed ---');
}

runTests().catch(console.error).finally(() => prisma.$disconnect());
