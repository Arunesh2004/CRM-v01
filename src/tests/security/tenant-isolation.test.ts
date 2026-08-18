import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import { withTenant } from '../../../database/utils/prisma-tenant';
import globalPrisma from '../../../database/utils/prisma';

async function runTenantIsolationTests() {
  console.log('--- Running Tenant Isolation Attack Tests ---');

  const tenantAId = crypto.randomUUID();
  const tenantBId = crypto.randomUUID();
  
  await globalPrisma.tenant.create({ data: { id: tenantAId, name: 'Tenant A' } });
  await globalPrisma.tenant.create({ data: { id: tenantBId, name: 'Tenant B' } });

  // Create Customer in Tenant B
  const customerBId = crypto.randomUUID();
  await globalPrisma.customer.create({
    data: {
      id: customerBId,
      tenantId: tenantBId,
      name: 'Customer B',
      normalizedName: 'customer b'
    }
  });

  // Test 1: Tenant A attempts to access Tenant B Customer
  console.log('TEST 1: Tenant A accesses Tenant B Customer (Expect: Blocked)');
  const tenantAPrisma = withTenant(tenantAId);
  try {
    // Attempting to query Customer B using Tenant A's Prisma client
    const res = await tenantAPrisma.customer.findUnique({ where: { id: customerBId } });
    if (res) {
      throw new Error('Test 1 Failed: Tenant A read Tenant B data!');
    }
    console.log('✅ Success: Tenant A returned null for Tenant B data');
  } catch (e: any) {
    if (e.message.includes('Test 1 Failed')) throw e;
    console.log('✅ Success: Tenant A blocked from Tenant B data');
  }

  // Cleanup
  await globalPrisma.customer.deleteMany({ where: { id: customerBId } });
  await globalPrisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
}

runTenantIsolationTests().catch(e => {
  console.error('Fatal Error:', e);
  process.exit(1);
});
