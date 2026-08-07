import { ensureUserProvisioned } from './src/modules/auth/services/provisioning.service';
import prisma from './database/utils/prisma';

async function main() {
  console.log('--- TEST 1: Initial Provisioning ---');
  const mockClerkUser = {
    id: 'user_test_123',
    emailAddresses: [{ emailAddress: 'test1234@acmesecurity.com' }],
    firstName: 'Test',
    lastName: 'User',
    publicMetadata: {}
  };
  
  const user1 = await ensureUserProvisioned(mockClerkUser);
  console.log('Result 1:', user1);
  
  console.log('\n--- TEST 2: Idempotent Replay ---');
  const user2 = await ensureUserProvisioned(mockClerkUser);
  console.log('Result 2:', user2);
  
  if (user1.id === user2.id) {
    console.log('SUCCESS: No duplicate user created.');
  } else {
    console.error('FAIL: Duplicate user created.');
  }
  
  const allUsers = await prisma.user.findMany({ where: { clerkId: 'user_test_123' }});
  if (allUsers.length === 1) {
    console.log('SUCCESS: Only 1 user record in DB.');
  } else {
    console.error(`FAIL: ${allUsers.length} user records in DB.`);
  }

  const allTenants = await prisma.tenant.findMany({ where: { id: user1.tenantId }});
  if (allTenants.length === 1) {
    console.log('SUCCESS: Only 1 tenant record in DB.');
  } else {
    console.error(`FAIL: ${allTenants.length} tenant records in DB.`);
  }
  
  console.log('\n--- TEST 3: Cleanup ---');
  await prisma.user.delete({ where: { clerkId: 'user_test_123' }});
  await prisma.tenant.delete({ where: { id: user1.tenantId }});
  console.log('Cleanup successful.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
