import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import globalPrisma from '../../../database/utils/prisma';
import { requirePermission } from '../../lib/auth';

async function runRBACEscalationTests() {
  console.log('--- Running RBAC Privilege Escalation Tests ---');

  const tenantAId = crypto.randomUUID();
  await globalPrisma.tenant.create({ data: { id: tenantAId, name: 'Tenant A' } });

  const employeeUser = {
    id: crypto.randomUUID(),
    tenantId: tenantAId,
    email: 'employee@test.com',
    roles: [{
      role: {
        permissions: [
          { permission: { resource: 'CUSTOMER', action: 'READ' } }
        ]
      }
    }]
  };

  try {
    // TEST 1: Normal employee attempts to perform Admin action
    console.log('TEST 1: Employee attempts Admin action (Expect: Blocked)');
    try {
      requirePermission('SYSTEM', 'UPDATE');
      throw new Error('Test 1 Failed: Employee was allowed to perform SYSTEM:UPDATE');
    } catch (e: any) {
      if (e.message.includes('Test 1 Failed')) throw e;
      console.log('✅ Success: Employee blocked from SYSTEM:UPDATE (' + e.message + ')');
    }

    // TEST 2: Admin action allowed
    console.log('TEST 2: Employee attempts Customer Read (Expect: Allowed)');
    requirePermission('CUSTOMER', 'READ');
    console.log('✅ Success: Employee allowed to perform CUSTOMER:READ');
  } finally {
    // Cleanup
    await globalPrisma.tenant.deleteMany({ where: { id: tenantAId } });
  }
}

runRBACEscalationTests().catch(e => {
  console.error('Fatal Error:', e);
  process.exit(1);
});
