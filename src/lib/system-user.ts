import prisma from '@/../database/utils/prisma';

export async function getSystemUser(tenantId: string) {
  const systemClerkId = `SYSTEM_${tenantId}`;
  
  const user = await prisma.user.upsert({
    where: { clerkId: systemClerkId },
    update: {}, // idempotent
    create: {
      clerkId: systemClerkId,
      email: `system_${tenantId}@internal.app`,
      tenantId: tenantId,
      status: 'ACTIVE'
    }
  });

  return user;
}
