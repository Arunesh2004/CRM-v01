import { auth, clerkClient } from '@clerk/nextjs/server';
import prisma from '@/../database/utils/prisma';
import { Action, Resource } from '@prisma/client';
import { ensureUserProvisioned } from '@/modules/auth/services/provisioning.service';
import { Logger } from '@/lib/observability/logger';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';

import { cache } from 'react';

const logger = new Logger();

/** The common DB include needed for full user context. */
const USER_INCLUDE = {
  tenant: true,
  userRoles: {
    include: { role: { include: { permissions: { include: { permission: true } } } } }
  }
} as const;

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
async function tryLoadTestIdentity(): Promise<any | null> {
  // Triple-gate: all conditions must pass or we immediately return null
  if (process.env.NODE_ENV === 'production') return null;
  if (process.env.CRM_LOAD_TEST_AUTH_ENABLED !== 'true') return null;
  const secret = process.env.LOAD_TEST_SECRET;
  if (!secret) return null;

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
  } catch (err: any) {
    // Do NOT log the token. Log only the verification failure type.
    logger.error('Load-test token verification failed', undefined, { reason: err?.name });
    return null;
  }

  // Validate required purpose claim
  if (decoded['purpose'] !== 'crm-phase26-load-test') return null;

  // Extract only the subject (userId)
  const userId = decoded['sub'];
  if (!userId || typeof userId !== 'string') return null;

  // Resolve the user from DB — tenant comes from DB, never from token
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: USER_INCLUDE,
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

  // LEGACY: Global TEST_USER_ID bypass — intentionally left to avoid breaking existing local dev
  // workflows but remains unsafe for Vercel (see Phase 26 auth report).
  if (process.env.TEST_USER_ID) {
    return await prisma.user.findUnique({
      where: { id: process.env.TEST_USER_ID },
      include: USER_INCLUDE,
    });
  }

  const clerkAuth = await auth();
  const clerkId = clerkAuth.userId;

  if (!clerkId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: USER_INCLUDE,
  });

  return user;
});

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
    const user = await client.users.getUser(clerkId);
    await ensureUserProvisioned(user);
  } catch (err: any) {
    logger.error('Failed to fetch and provision user from Clerk', undefined, { clerkId, name: err?.name });
  }
}

export async function requireAuth() {
  let user = await getCurrentUser();
  if (!user) {
    const clerkAuth = await auth();
    if (clerkAuth.userId) {
      await ensureUserProvisionedFromClerk(clerkAuth.userId);
      user = await getCurrentUser();
    }
    if (!user) {
      throw new Error('Unauthorized');
    }
  }
  return user;
}

export async function requireTenant() {
  if (process.env.TEST_TENANT_ID) {
    return process.env.TEST_TENANT_ID;
  }
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

