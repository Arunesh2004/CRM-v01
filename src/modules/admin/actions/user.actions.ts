'use server';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';
import { Resource, Action } from '@prisma/client';

export async function getUsersAction() {
  try {
    const tenantId = await requireTenant();
    await requireAuth();
    // Assuming MANAGE_SYSTEM or MANAGE_USERS is required
    await requirePermission(Resource.SYSTEM, Action.MANAGE_TERRITORIES); // Using existing permission check for admin

    const prisma = withTenant(tenantId);
    
    const users = await prisma.user.findMany({
      where: { tenantId },
      orderBy: { email: 'asc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
      }
    });

    return { success: true, data: users };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
