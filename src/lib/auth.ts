import { auth, clerkClient } from '@clerk/nextjs/server';
import { Action, Resource, Prisma } from '@prisma/client';
import { synchronizeClerkIdentity } from '@/modules/auth/services/provisioning.service';
import { Logger } from '@/lib/observability/logger';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { redis } from '@/lib/cache/redis.client';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { setTenantContext } from '@/lib/observability/context';

import { cache } from 'react';

const logger = new Logger();

// AuthUser: the strict Prisma payload type returned by every authenticated DB lookup.
// Defined here so getCurrentUser, requireAuth, and callers share a single source of truth.
export type AuthUser = Prisma.UserGetPayload<{
  include: {
    tenant: true;
    userRoles: {
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true };
            };
          };
        };
      };
    };
  };
}>;

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
  console.log('[AUTH] NODE_ENV:', process.env.NODE_ENV);
  console.log('[AUTH] CRM_LOAD_TEST_AUTH_ENABLED:', process.env.CRM_LOAD_TEST_AUTH_ENABLED);
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') return false;
  if (process.env.CRM_LOAD_TEST_AUTH_ENABLED?.trim() !== 'true') return false;
  if (!process.env.LOAD_TEST_SECRET) return false;
  return true;
}

async function tryLoadTestIdentity() {
  // Triple-gate: all conditions must pass or we immediately return null
  if (!isLoadTestAuthEnabled()) return null;
  const secret = process.env.LOAD_TEST_SECRET?.trim() as string;

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
    const errObj = err as Error;
    console.log('[AUTH DEBUG] LOAD_TEST_SECRET length is:', secret.length, 'ends with:', secret.substring(secret.length - 3));
    logger.error('Load-test token verification failed', undefined, { reason: errObj?.name, message: errObj?.message });
    return null;
  }

  // Validate required purpose claim
  if (decoded['purpose'] !== 'crm-phase26-load-test') return null;

  // Extract only the subject (userId)
  const userId = decoded['sub'];
  if (!userId || typeof userId !== 'string') return null;

  // Resolve the user from DB — tenant comes from DB, never from token
  const user = await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
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

  if (!user) {
    logger.error('Load-test token rejected: user not found in DB', undefined, { userId });
    return null;
  }

  // Enforce: only explicitly provisioned AUDIT_ users may use this path
  if (!user.email.startsWith('audit-load-') && !user.email.includes('AUDIT_LOAD')) {
    logger.error('Load-test token rejected: non-audit user attempted load-test auth', undefined, { userId: '[REDACTED]' });
    return null;
  }

  logger.info('Load-test token accepted', { userId });
  return user;
}

export const getCurrentUser = cache(async function getCurrentUser(): Promise<AuthUser | null> {
  // STAGING-ONLY: Load-test identity bridge (never active in production)
  const loadTestUser = await tryLoadTestIdentity();
  if (loadTestUser) return loadTestUser;

  let clerkAuth;
  try {
    clerkAuth = await auth();
    logger.info('[AUTH_DIAGNOSTIC] getCurrentUser auth result:', {
      authenticated: !!clerkAuth.userId,
      hasUserId: !!clerkAuth.userId,
      userId: clerkAuth.userId || 'NONE'
    });
  } catch (err: unknown) {
    const errorObj = err as Error;
    logger.error('[AUTH_DIAGNOSTIC] getCurrentUser auth threw:', undefined, {
      errorName: errorObj?.name,
      errorMessage: errorObj?.message
    });
    throw err;
  }
  
  const clerkId = clerkAuth.userId;

  if (!clerkId) {
    logger.info('[AUTH_DIAGNOSTIC] getCurrentUser result:', { result: 'NULL' });
    return null;
  }

  if (redis) {
    const cached = await redis.get(`user:${clerkId}`);
    // Cache is written via JSON.stringify(user); Upstash Redis deserializes automatically on get().
    if (cached) {
       logger.info('[AUTH_DIAGNOSTIC] getCurrentUser result:', { result: 'FOUND_IN_CACHE' });
       return cached as unknown as AuthUser;
    }
  }

  // Diagnostic: Check environment DB URLs safely
  const parseSafeUrl = (url: string | undefined) => {
    if (!url) return 'MISSING';
    try {
      const u = new URL(url);
      return { host: u.hostname, db: u.pathname };
    } catch { return 'INVALID'; }
  };
  logger.info('[AUTH_DIAGNOSTIC] Env DB URLs:', {
    DATABASE_URL: parseSafeUrl(process.env.DATABASE_URL),
    ADMIN_DATABASE_URL: parseSafeUrl(process.env.ADMIN_DATABASE_URL)
  });

  let user;
  try {
    user = await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
      try {
        const meta = await tx.$queryRaw`
          SELECT
            current_database() as db,
            current_user as usr,
            current_schema() as schema,
            current_setting('search_path') as search_path,
            inet_server_addr() as server_addr,
            inet_server_port() as server_port,
            version() as version
        `;
        logger.info('[AUTH_DIAGNOSTIC] Extended DB Connection Info:', { meta });
      } catch (dbErr: any) {
        logger.error('[AUTH_DIAGNOSTIC] Extended DB Connection Error:', undefined, { errorMessage: dbErr.message });
      }

      try {
        const rlsMeta = await tx.$queryRaw`
          SELECT relrowsecurity, relforcerowsecurity
          FROM pg_class
          WHERE relname = 'User'
        `;
        logger.info('[AUTH_DIAGNOSTIC] RLS status:', { rlsMeta });
      } catch (rlsErr: any) {
        logger.error('[AUTH_DIAGNOSTIC] RLS status error:', undefined, { errorMessage: rlsErr.message });
      }

      try {
        const policies = await tx.$queryRaw`
          SELECT policyname, cmd, roles, qual::text as using_expr, with_check::text as check_expr
          FROM pg_policies
          WHERE tablename = 'User'
        `;
        logger.info('[AUTH_DIAGNOSTIC] RLS policies:', { policies });
      } catch (polErr: any) {
        logger.error('[AUTH_DIAGNOSTIC] RLS policies error:', undefined, { errorMessage: polErr.message });
      }

      try {
        const rawUserById = await tx.$queryRaw`
          SELECT id, "clerkId", email, status, "tenantId"
          FROM "User"
          WHERE "clerkId" = ${clerkId}
          LIMIT 1
        `;
        logger.info('[AUTH_DIAGNOSTIC] raw SQL User lookup by clerkId:', { rawUserById });
      } catch (rawErr: any) {
        logger.error('[AUTH_DIAGNOSTIC] raw SQL clerkId error:', undefined, { errorMessage: rawErr.message });
      }

      try {
        const rawUserByEmail = await tx.$queryRaw`
          SELECT id, "clerkId", email, status, "tenantId"
          FROM "User"
          WHERE email = 'vasudevrathore126@gmail.com'
          LIMIT 1
        `;
        logger.info('[AUTH_DIAGNOSTIC] raw SQL User lookup by email:', { rawUserByEmail });
      } catch (rawEmailErr: any) {
        logger.error('[AUTH_DIAGNOSTIC] raw SQL email error:', undefined, { errorMessage: rawEmailErr.message });
      }

      try {
        const prismaUserByEmail = await tx.user.findFirst({
          where: { email: 'vasudevrathore126@gmail.com' }
        });
        logger.info('[AUTH_DIAGNOSTIC] Prisma User lookup by email:', {
           result: prismaUserByEmail ? 'FOUND' : 'NOT_FOUND',
           id: prismaUserByEmail?.id
        });
      } catch (prismaEmailErr: any) {
        logger.error('[AUTH_DIAGNOSTIC] Prisma email error:', undefined, { errorMessage: prismaEmailErr.message });
      }

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

    if (user) {
      logger.info('[AUTH_DIAGNOSTIC] CRM clerkId lookup:', {
        result: 'FOUND',
        userId: user.id,
        status: user.status,
        tenantId: user.tenantId
      });
    } else {
      logger.info('[AUTH_DIAGNOSTIC] CRM clerkId lookup:', { result: 'NOT_FOUND' });
    }
  } catch (err: unknown) {
    const errorObj = err as Error;
    logger.error('[AUTH_DIAGNOSTIC] CRM clerkId lookup error:', undefined, {
      result: 'ERROR',
      errorName: errorObj?.name,
      errorMessage: errorObj?.message
    });
    throw err;
  }

  if (!user) {
    logger.info('[AUTH_DIAGNOSTIC] entering Clerk identity provisioning fallback');
    let syncedUser;
    try {
      syncedUser = await ensureUserProvisionedFromClerk(clerkId);
      logger.info('[AUTH_DIAGNOSTIC] provisioning result:', { result: syncedUser ? 'FOUND' : 'NOT_FOUND' });
    } catch (err: unknown) {
      const errorObj = err as Error;
      logger.error('[AUTH_DIAGNOSTIC] provisioning result error:', undefined, {
        result: 'ERROR',
        errorName: errorObj?.name,
        errorMessage: errorObj?.message
      });
      // Do not swallow if the function wasn't catching it, but ensureUserProvisionedFromClerk does catch internally.
    }
    
    if (syncedUser) {
      user = await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
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
    }
  }

  if (redis && user) {
    await redis.set(`user:${clerkId}`, JSON.stringify(user), { ex: 3600 });
  }

  if (user) {
    logger.info('[AUTH_DIAGNOSTIC] getCurrentUser result:', {
      result: 'FOUND',
      userId: user.id,
      status: user.status,
      tenantId: user.tenantId,
      role: user.userRoles?.[0]?.role?.name
    });
  } else {
    logger.info('[AUTH_DIAGNOSTIC] getCurrentUser result:', { result: 'NULL' });
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
    if (clerkUser.primaryEmailAddressId && clerkUser.emailAddresses) {
      const primary = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId);
      if (primary) email = primary.emailAddress;
    }
    if (!email) return null;
    return await synchronizeClerkIdentity(clerkId, email);
  } catch (err: unknown) {
    logger.error('Failed to fetch and provision user from Clerk', undefined, { clerkId, name: (err as { name?: string })?.name });
    return null;
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    // NOTE: Throw an Error — do NOT redirect here.
    // requireAuth() is called from API routes, Server Actions, AND Server Component layouts.
    // API routes catch this error and return HTTP 401.
    // Server Component layouts (e.g. (crm)/layout.tsx) handle redirect to /sign-in explicitly.
    throw new Error('Unauthorized');
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
  
  setTenantContext(tenant.id);
  
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
  const userRoles = await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
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

  // Debug-level permission tracing — routed through Logger so it respects LOG_LEVEL and redaction
  // import is lazy to avoid circular-dep risk at module load time

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
  const secret = process.env.LOAD_TEST_SECRET?.trim() as string;

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
    const errObj = err as Error;
    logger.error('Load-test token verification failed', undefined, { reason: errObj?.name, message: errObj?.message, secretSuffix: secret.substring(secret.length - 5) });
    return null;
  }

  if (decoded['purpose'] !== 'crm-phase26-load-test') return null;

  const userId = decoded['sub'];
  if (!userId || typeof userId !== 'string') return null;

  // SHALLOW LOOKUP: No roles, no permissions, no related tenant object.
  const user = await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
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
      // NOTE: Throw an Error — do NOT redirect here.
      // requireAuthIdentity() is called from API routes which must return HTTP 401.
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

