import { withTenant } from '../database/utils/prisma-tenant';
import prisma from '../database/utils/prisma';

async function runTests() {
  console.log('--- Running Tenant Isolation Tests ---');
  
  // 1. Setup Data
  const tenantA = await prisma.tenant.create({ data: { name: 'Tenant A' }});
  const tenantB = await prisma.tenant.create({ data: { name: 'Tenant B' }});
  
  const userA = await prisma.user.create({ data: { clerkId: 'user_a_' + Date.now(), email: 'a@a.com', tenantId: tenantA.id }});
  const userB = await prisma.user.create({ data: { clerkId: 'user_b_' + Date.now(), email: 'b@b.com', tenantId: tenantB.id }});
  
  // 2. Test Isolation
  const prismaTenantA = withTenant(tenantA.id);
  
  const usersA = await prismaTenantA.user.findMany();
  if (!(usersA.length === 1 && usersA[0].id === userA.id)) throw new Error('Tenant A should only see User A');
  console.log('✔ Tenant isolation successful (findMany)');
  
  try {
    await prismaTenantA.user.update({
      where: { id: userB.id },
      data: { status: 'INACTIVE' }
    });
    throw new Error('Should not be able to update another tenant\'s user');
  } catch (error: any) {
    if (!error.message.includes('Record not found or access denied')) throw error;
    console.log('✔ Cross-tenant update prevented');
  }

  // 3. Immutability
  try {
    await prismaTenantA.user.update({
      where: { id: userA.id },
      data: { tenantId: tenantB.id }
    });
    throw new Error('Should not be able to change tenantId');
  } catch (error: any) {
    if (error.message !== 'Tenant ID is immutable') throw error;
    console.log('✔ TenantId immutability enforced');
  }

  // 4. Cleanup
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } }});
  console.log('--- Tests Completed Successfully ---');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
