import prismaGlobal from '../database/utils/prisma';
import { withTenant, withTenantTransaction } from '../database/utils/prisma-tenant';
import * as crypto from 'crypto';

async function runTests() {
  console.log('--- Starting RLS Transaction Architecture Tests ---\n');
  const tenantA_Id = 'tenant-A-' + crypto.randomUUID();
  const tenantB_Id = 'tenant-B-' + crypto.randomUUID();

  // Create two tenants and dummy users via raw global queries so RLS is bypassed for setup
  await prismaGlobal.tenant.createMany({
    data: [
      { id: tenantA_Id, name: 'Tenant A' },
      { id: tenantB_Id, name: 'Tenant B' }
    ]
  });
  
  // Setup users for test 4
  const userA = crypto.randomUUID();
  const userB = crypto.randomUUID();
  await prismaGlobal.user.createMany({
    data: [
      { id: userA, email: 'a@t.com', tenantId: tenantA_Id, status: 'ACTIVE', onboardingStatus: 'COMPLETED' },
      { id: userB, email: 'b@t.com', tenantId: tenantB_Id, status: 'ACTIVE', onboardingStatus: 'COMPLETED' }
    ]
  });
  
  // Create test customers
  const custA = crypto.randomUUID();
  const custB = crypto.randomUUID();
  await prismaGlobal.customer.createMany({
    data: [
      { id: custA, name: 'Cust A', normalizedName: 'cust a', tenantId: tenantA_Id, status: 'ACTIVE' },
      { id: custB, name: 'Cust B', normalizedName: 'cust b', tenantId: tenantB_Id, status: 'ACTIVE' }
    ]
  });

  try {
    // Drop to a restricted role for testing
    try {
      await prismaGlobal.$executeRawUnsafe(`CREATE ROLE crm_app_user NOLOGIN`);
    } catch(e) {}
    try {
      await prismaGlobal.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO crm_app_user`);
      await prismaGlobal.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO crm_app_user`);
      await prismaGlobal.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO crm_app_user`);
    } catch(e) {}

    // Switch session role to restricted
    await prismaGlobal.$executeRawUnsafe(`SET ROLE crm_app_user`);
    
    // TEST 1: Standalone tenant query
    console.log('TEST 1: Standalone tenant query');
    const tPrismaA = withTenant(tenantA_Id);
    const result1 = await tPrismaA.customer.findMany();
    if (result1.length === 1 && result1[0].id === custA) {
      console.log('✅ Success: Standalone query returned correct tenant data');
    } else {
      throw new Error('Test 1 Failed');
    }

    // TEST 2: Existing transaction with tenant wrapper
    console.log('\nTEST 2: Existing transaction');
    let insertedCustId: string;
    await prismaGlobal.$transaction(async (tx) => {
       const tenantTx = await withTenantTransaction(tx, tenantA_Id);
       
       const cust = await tenantTx.customer.create({
          data: {
             name: 'Tx Cust A',
             normalizedName: 'tx cust a',
             status: 'ACTIVE',
             tenantId: tenantA_Id
          }
       });
       insertedCustId = cust.id;
       const fetched = await tenantTx.customer.findFirst({ where: { id: cust.id } });
       if (!fetched || fetched.id !== cust.id) {
          throw new Error('Test 2 Failed: Cannot see created data in transaction');
       }
    });
    console.log('✅ Success: Service transaction handled correctly');

    // TEST 3: Rollback test
    console.log('\nTEST 3: Rollback test');
    try {
       await prismaGlobal.$transaction(async (tx) => {
          const tenantTx = await withTenantTransaction(tx, tenantA_Id);
          await tenantTx.customer.create({ data: { name: 'Tx Rollback', normalizedName: 'tx rollback', status: 'ACTIVE', tenantId: tenantA_Id } });
          throw new Error('Intentional Fail');
       });
    } catch (e) {
       // expected
    }
    const result3 = await tPrismaA.customer.findMany({ where: { name: 'Tx Rollback' }});
    if (result3.length === 0) {
       console.log('✅ Success: Transaction rollback worked');
    } else {
       throw new Error('Test 3 Failed: Data persisted despite rollback');
    }

    // TEST 4: Cross tenant transaction attempt
    console.log('\nTEST 4: Cross tenant transaction attempt');
    await prismaGlobal.$transaction(async (tx) => {
       const tenantTx = await withTenantTransaction(tx, tenantA_Id);
       // Tenant A tries to read Cust B directly
       // First drop to raw to bypass the application layer defense-in-depth to verify RLS
       const crossQuery = await tx.$queryRawUnsafe(`SELECT * FROM "Customer" WHERE id = '${custB}'`);
       if ((crossQuery as any[]).length === 0) {
          console.log('✅ Success: RLS blocked cross-tenant access natively in transaction');
       } else {
          throw new Error('Test 4 Failed: Cross-tenant data leaked!');
       }
    });

  } finally {
    // Reset role and cleanup
    await prismaGlobal.$executeRawUnsafe(`RESET ROLE`);
    await prismaGlobal.$executeRawUnsafe(`DELETE FROM "Customer" WHERE "tenantId" IN ('${tenantA_Id}', '${tenantB_Id}')`);
    await prismaGlobal.$executeRawUnsafe(`DELETE FROM "User" WHERE "tenantId" IN ('${tenantA_Id}', '${tenantB_Id}')`);
    await prismaGlobal.$executeRawUnsafe(`DELETE FROM "Tenant" WHERE id IN ('${tenantA_Id}', '${tenantB_Id}')`);
    await prismaGlobal.$disconnect();
    console.log('\n--- All Tests Complete ---');
  }
}

runTests().catch(e => {
  console.error('Fatal Test Error:', e);
  process.exit(1);
});
