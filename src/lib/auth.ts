import { auth, clerkClient } from '@clerk/nextjs/server';
import prisma from '@db/utils/prisma';
import { Action, Resource } from '@prisma/client';
import { ensureUserProvisioned, synchronizeClerkIdentity } from '@/modules/auth/services/provisioning.service';
import { Logger } from '@/lib/observability/logger';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { redis } from '@/lib/cache/redis.client';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';

import { cache } from 'react';

const logger = new Logger();

// The common DB include needed for full user context is inlined below to preserve Prisma type inference.

/**
 * STAGING-ONLY LOAD-TEST IDENTITY BRIDGE
 *
 * Resolves an identity from a cryptographically signed x-load-test-token.
 * ONLY active when:
 *   - NODE_ENV !== 'production'
 *   - CRM_LOAD_TEST_AUTH_ENABLED === 'true'
 *   - LOAD_TEST_SECRET is set
 *   - Token passes full JWT verification (signature, audience, purpose, expiry)
 *   - Resolved user is an explicitly provisioned AUDIT_ user
 *
 * Tenant is ALWAYS resolved from the database; never from token claims.
 * Returns null on any verification failure (falls through to normal Clerk auth).
 */
function isLoadTestAuthEnabled(): boolean {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') return false;
  if (process.env.CRM_LOAD_TEST_AUTH_ENABLED !== 'true') return false;
  if (!process.env.LOAD_TEST_SECRET) return false;
  return true;
}

async function tryLoadTestIdentity() {
  // Triple-gate: all conditions must pass or we immediately return null
  if (!isLoadTestAuthEnabled()) return null;
  const secret = process.env.LOAD_TEST_SECRET as string;

  let token: string | null = null;
  try {
    const reqHeaders = await headers();
    token = reqHeaders.get('x-load-test-token');
  } catch {
    return null;
  }
  if (!token) return null;

  let decoded: jwt.JwtPayload;
  try {
    const raw = jwt.verify(token, secret, {
      audience: 'crm-staging-load-test',
      issuer: 'crm-phase26-runner',
      algorithms: ['HS256'],
    });
    if (typeof raw === 'string') return null;
    decoded = raw;
  } catch (err: unknown) {
    // Do NOT log the token. Log only the verification failure type.
    logger.error('Load-test token verification failed', undefined, { reason: (err as { name?: string })?.name });
    return null;
  }

  // Validate required purpose claim
  if (decoded['purpose'] !== 'crm-phase26-load-test') return null;

  // Extract only the subject (userId)
  const userId = decoded['sub'];
  if (!userId || typeof userId !== 'string') return null;

  // Resolve the user from DB — tenant comes from DB, never from token
  const user = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
    return tx.user.findUnique({
      where: { id: userId },
      include: {
        tenant: true,
        userRoles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } }
        }
      }
    });
  });

  if (!user) return null;

  // Enforce: only explicitly provisioned AUDIT_ users may use this path
  if (!user.email.startsWith('audit-load-') && !user.email.includes('AUDIT_LOAD')) {
    logger.error('Load-test token rejected: non-audit user attempted load-test auth', undefined, { userId: '[REDACTED]' });
    return null;
  }

  return user;
}

export const getCurrentUser = cache(async function getCurrentUser() {
  // STAGING-ONLY: Load-test identity bridge (never active in production)
  const loadTestUser = await tryLoadTestIdentity();
  if (loadTestUser) return loadTestUser;



  const clerkAuth = await auth();
  const clerkId = clerkAuth.userId;

  if (!clerkId) {
    return null;
  }

  if (redis) {
    const cached = await redis.get(`user:${clerkId}`);
    if (cached) return cached as any;
  }

  const user = await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
    return tx.user.findFirst({
      where: { clerkId },
      include: {
        tenant: true,
        userRoles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } }
        }
      }
    });
  });

  if (redis && user) {
    await redis.set(`user:${clerkId}`, JSON.stringify(user), { ex: 3600 });
  }

  return user;
});

export async function invalidateUserCache(clerkId: string) {
  if (redis) {
    await redis.del(`user:${clerkId}`);
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
      (rp: { permission: { resource: string; action: string } }) => rp.permission.resource === resource && rp.permission.action === action
    );

    if (hasPermission) return true;
  }

  return false;
}

async function ensureUserProvisionedFromClerk(clerkId: string) {
  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkId);
    let email = '';
    if (clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
      email = clerkUser.emailAddresses[0].emailAddress;
    }
    if (!email) return null;
    return await synchronizeClerkIdentity(clerkId, email);
  } catch (err: unknown) {
    logger.error('Failed to fetch and provision user from Clerk', undefined, { clerkId, name: (err as { name?: string })?.name });
    return null;
  }
}

export async function requireAuth() {
  let user = await getCurrentUser();
  if (!user) {
    const clerkAuth = await auth();
    if (clerkAuth.userId) {
      // Fast path failed (clerkId not found), so attempt synchronization (bootstrap or invite linking)
      const syncedUser = await ensureUserProvisionedFromClerk(clerkAuth.userId);
      if (syncedUser) {
        user = await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
          return tx.user.findFirst({
            where: { clerkId: clerkAuth.userId },
            include: {
              tenant: true,
              userRoles: {
                include: { role: { include: { permissions: { include: { permission: true } } } } }
              }
            }
          });
        });
      }
    }
    if (!user) {
      throw new Error('Unauthorized');
    }
  }

  if (user.status === 'INACTIVE') {
    throw new Error('Unauthorized');
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
  // removed test bypass
  const hasPermission = await checkPermission(resource, action);
  if (!hasPermission) {
    throw new Error(`Forbidden: Requires ${action} on ${resource}`);
  }
  return true;
}

// ============================================================================
// PHASE 26E: LIGHTWEIGHT IDENTITY RESOLUTION FOR HIGH-THROUGHPUT READ PATHS
// ============================================================================

export async function checkPermissionFast(userId: string, resource: Resource, action: Action): Promise<boolean> {
  // Query only what we need to determine if the user has the permission or is an admin.
  // We use executeAsSystem here because reading UserRole and RolePermission requires 
  // system privileges when no tenant context is yet active (RLS would otherwise block it).
  const userRoles = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
    return tx.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true }
            }
          }
        }
      }
    });
  });

  console.log(`[DEBUG] checkPermissionFast: userId=${userId}, resource=${resource}, action=${action}, rolesFound=${userRoles.length}`);
  if (userRoles.length > 0) {
    console.log(`[DEBUG] Role 0 name=${userRoles[0].role.name}, permissions count=${userRoles[0].role.permissions.length}`);
  }

  for (const userRole of userRoles) {
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

export async function requirePermissionFast(userId: string, resource: Resource, action: Action) {
  const hasPermission = await checkPermissionFast(userId, resource, action);
  if (!hasPermission) {
    throw new Error(`Forbidden: Requires ${action} on ${resource}`);
  }
  return true;
}

async function tryLoadTestIdentityLight() {
  if (!isLoadTestAuthEnabled()) return null;
  const secret = process.env.LOAD_TEST_SECRET as string;

  let token: string | null = null;
  try {
    const reqHeaders = await headers();
    token = reqHeaders.get('x-load-test-token');
  } catch {
    return null;
  }
  if (!token) return null;

  let decoded: jwt.JwtPayload;
  try {
    const raw = jwt.verify(token, secret, {
      audience: 'crm-staging-load-test',
      issuer: 'crm-phase26-runner',
      algorithms: ['HS256'],
    });
    if (typeof raw === 'string') return null;
    decoded = raw;
  } catch (err: unknown) {
    logger.error('Load-test token verification failed', undefined, { reason: (err as { name?: string })?.name });
    return null;
  }

  if (decoded['purpose'] !== 'crm-phase26-load-test') return null;

  const userId = decoded['sub'];
  if (!userId || typeof userId !== 'string') return null;

  // SHALLOW LOOKUP: No roles, no permissions, no related tenant object.
  const user = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
    return tx.user.findUnique({
      where: { id: userId },
      select: { id: true, tenantId: true, email: true, status: true }
    });
  });

  if (!user) return null;

  if (!user.email.startsWith('audit-load-') && !user.email.includes('AUDIT_LOAD')) {
    logger.error('Load-test token rejected: non-audit user attempted load-test auth', undefined, { userId: '[REDACTED]' });
    return null;
  }

  return user;
}

export const getCurrentUserIdentity = cache(async function getCurrentUserIdentity() {
  const loadTestUser = await tryLoadTestIdentityLight();
  if (loadTestUser) return loadTestUser;



  const clerkAuth = await auth();
  const clerkId = clerkAuth.userId;

  if (!clerkId) {
    return null;
  }

  const user = await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
    return tx.user.findFirst({
      where: { clerkId },
      select: { id: true, tenantId: true, email: true, status: true }
    });
  });

  return user;
});

export async function requireAuthIdentity() {
  let user = await getCurrentUserIdentity();
  if (!user) {
    const clerkAuth = await auth();
    if (clerkAuth.userId) {
      const syncedUser = await ensureUserProvisionedFromClerk(clerkAuth.userId);
      if (syncedUser) {
        user = await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
          return tx.user.findFirst({
            where: { clerkId: clerkAuth.userId },
            select: { id: true, tenantId: true, email: true, status: true }
          });
        });
      }
    }
    if (!user) {
      throw new Error('Unauthorized');
    }
  }

  if (user.status === 'INACTIVE') {
    throw new Error('Unauthorized');
  }

  return user;
}

export function requireTenantFromIdentity(user: { tenantId: string | null }) {

  if (!user || !user.tenantId) {
    throw new Error('Tenant Context Missing');
  }
  return user.tenantId;
}

