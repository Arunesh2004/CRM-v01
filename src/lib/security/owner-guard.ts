import prisma from '@db/utils/prisma';
import { getCurrentUser } from '../auth';

export async function assertTenantOwner(tenantId: string, userId?: string) {
  let actingUserId = userId;
  
  if (!actingUserId) {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Unauthorized: Cannot verify ownership context");
    }
    actingUserId = user.id;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  if (tenant.ownerId !== actingUserId) {
    throw new Error("Forbidden: This action requires Owner authority");
  }

  return true;
}
