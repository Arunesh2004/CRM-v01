import { auth, clerkClient } from '@clerk/nextjs/server';
import prisma from '@/../database/utils/prisma';
import { Action, Resource } from '@prisma/client';
import { ensureUserProvisioned } from '@/modules/auth/services/provisioning.service';

export async function getCurrentUser() {
  console.log('[AUTH-DIAG] getCurrentUser execution started');
  let clerkId: string | null | undefined = process.env.TEST_CLERK_ID;
  if (!clerkId) {
    const clerkAuth = await auth();
    clerkId = clerkAuth.userId;
    console.log('[AUTH-DIAG] getCurrentUser auth() returned clerkId:', clerkId ? clerkId.substring(0, 8) : 'null');
  } else {
    console.log('[AUTH-DIAG] getCurrentUser using TEST_CLERK_ID');
  }

  if (!clerkId) {
    console.log('[AUTH-DIAG] getCurrentUser returning null due to falsy clerkId');
    return null;
  }

  console.log('[AUTH-DIAG] prisma-user-lookup-start for clerkId:', clerkId.substring(0, 8));
  try {
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
    console.log('[AUTH-DIAG] prisma-user-lookup-success, user found:', !!user);
    return user;
  } catch (err: any) {
    console.error('[AUTH-DIAG] prisma-user-lookup ERROR:', err);
    throw err;
  }
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

async function ensureUserProvisionedFromClerk(clerkId: string) {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkId);
    await ensureUserProvisioned(user);
  } catch (err) {
    console.error(`Failed to fetch and provision user from Clerk (ID: ${clerkId})`, err);
  }
}

export async function requireAuth() {
  console.log('[AUTH-DIAG] requireAuth-enter');
  
  console.log('[AUTH-DIAG] AUTH_DIAGNOSTIC', JSON.stringify({
    environment: process.env.NODE_ENV,
    clerkPublishablePrefix: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 8),
    hasClerkSecretKey: !!process.env.CLERK_SECRET_KEY,
    hasDatabaseUrl: !!process.env.DATABASE_URL
  }));

  console.log('[AUTH-DIAG] getCurrentUser-start (1)');
  let user = await getCurrentUser();
  if (!user) {
    console.log('[AUTH-DIAG] auth-called');
    const clerkAuth = await auth();
    console.log('[AUTH-DIAG] auth-userid-present:', !!clerkAuth?.userId, clerkAuth?.userId ? clerkAuth.userId.substring(0, 8) : 'null');
    
    if (clerkAuth.userId) {
      console.log('[AUTH-DIAG] provisioning-start');
      await ensureUserProvisionedFromClerk(clerkAuth.userId);
      console.log('[AUTH-DIAG] getCurrentUser-start (2)');
      user = await getCurrentUser();
    }
    if (!user) {
      console.log('[AUTH-DIAG] unauthorized');
      throw new Error('Unauthorized');
    }
  }
  return user;
}

export async function requireTenant() {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    throw new Error('Tenant Context Missing');
  }
  if (tenant.status !== 'ACTIVE') {
    throw new Error('Forbidden: Tenant is not ACTIVE');
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

