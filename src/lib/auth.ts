import { auth } from '@clerk/nextjs/server';
import prisma from '@/../database/utils/prisma';
import { Action, Resource } from '@prisma/client';

export async function getCurrentUser() {
  let clerkId: string | null | undefined = process.env.TEST_CLERK_ID;
  if (!clerkId) {
    const clerkAuth = await auth();
    clerkId = clerkAuth.userId;
  }

  if (!clerkId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      tenant: true,
      userRoles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  });

  return user;
}

export async function getCurrentTenant() {
  const user = await getCurrentUser();
  if (!user || !user.tenantId) {
    return null;
  }
  
  return user.tenant;
}

export async function checkPermission(resource: Resource, action: Action) {
  const user = await getCurrentUser();
  if (!user) return false;

  for (const userRole of user.userRoles) {
    if (userRole.role.name === 'TENANT_ADMIN' || userRole.role.name === 'GLOBAL_ADMIN') {
      return true;
    }

    const hasPermission = userRole.role.permissions.some(
      (rp) => rp.permission.resource === resource && rp.permission.action === action
    );

    if (hasPermission) return true;
  }

  return false;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireTenant() {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    throw new Error('Tenant Context Missing');
  }
  return tenant.id;
}

export async function requirePermission(resource: Resource, action: Action) {
  const hasPermission = await checkPermission(resource, action);
  if (!hasPermission) {
    throw new Error(`Forbidden: Requires ${action} on ${resource}`);
  }
  return true;
}

