import { PrismaClient } from '@prisma/client';
import { withTenant } from '../database/utils/prisma-tenant';
import { v4 as uuidv4 } from 'uuid';

const globalPrisma = new PrismaClient();

async function testNested() {
  const tenantId = 'dummy-tenant-id';
  const tenantPrisma = withTenant(tenantId);

  console.log('Testing nested transactions...');
  try {
    await tenantPrisma.$transaction(async (tx) => {
      console.log('Inside outer transaction');
      // This call triggers $allOperations, which then attempts to do prisma.$transaction internally!
      await tx.user.findFirst({ where: { id: 'test' } });
    });
    console.log('Success: Nested transactions handled!');
  } catch (e) {
    console.error('Error with nested transactions:', e);
  }
}

testNested().then(() => globalPrisma.$disconnect());
