import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import prisma from '@db/utils/prisma';

export async function getSystemUser(tenantId: string) {
  const systemClerkId = `SYSTEM_${tenantId}`;
  
  let user = await withTenant(tenantId).user.findFirst({
    where: { clerkId: systemClerkId, tenantId }
  });

  if (!user) {
    const crypto = require('crypto');
    const empId = `EMP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    user = await withTenant(tenantId).user.create({
      data: {
        clerkId: systemClerkId,
        email: `system_${tenantId}@internal.app`,
        employeeId: empId,
        tenantId: tenantId,
        status: 'ACTIVE',
        onboardingStatus: 'COMPLETED'
      }
    });
  }

  return user;
}
