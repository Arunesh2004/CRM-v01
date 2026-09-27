import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { createSession, resolveSession, revokeCurrentSession } from '@/lib/auth/session';
import { getCurrentUser, requireAuth, checkPermission } from '@/lib/auth';
import prisma from '@db/utils/prisma';
import crypto from 'crypto';
import * as headers from 'next/headers';

vi.mock('next/headers', () => {
  const store = new Map<string, any>();
  return {
    cookies: vi.fn().mockReturnValue({
      get: (name: string) => store.get(name),
      set: (name: string, value: string, options: any) => store.set(name, { value, options }),
      delete: (name: string) => store.delete(name),
    }),
  };
});

describe('Phase 3: Native Authentication Core', () => {
  let tenant: any;
  let user: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    (headers.cookies as any)().delete('crm_session');
    
    tenant = await prisma.tenant.create({
      data: { name: `Test Tenant ${crypto.randomUUID()}`, status: 'ACTIVE' }
    });

    user = await prisma.user.create({
      data: {
        email: `native_${crypto.randomUUID()}@test.com`,
        tenantId: tenant.id,
        status: 'ACTIVE',
      }
    });
  });

  describe('Password Hashing', () => {
    it('1. Password hashes are not plaintext', async () => {
      const pwd = 'securePassword123';
      const hash = await hashPassword(pwd);
      expect(hash).not.toContain(pwd);
      expect(hash).toContain('$argon2id$');
    });

    it('2. Same password can be verified', async () => {
      const pwd = 'securePassword123';
      const hash = await hashPassword(pwd);
      const isValid = await verifyPassword(pwd, hash);
      expect(isValid).toBe(true);
    });

    it('3. Wrong password fails', async () => {
      const hash = await hashPassword('correctPassword');
      const isValid = await verifyPassword('wrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('8. Valid session resolves correct User', async () => {
      await createSession(user.id);
      const sessionUser = await resolveSession();
      expect(sessionUser).not.toBeNull();
      expect(sessionUser?.id).toBe(user.id);
    });

    it('11. Unknown session is rejected', async () => {
      (headers.cookies as any)().set('crm_session', 'randominvalidtoken', {});
      const sessionUser = await resolveSession();
      expect(sessionUser).toBeNull();
    });

    it('12. Logout revokes session', async () => {
      await createSession(user.id);
      const sessionBefore = await resolveSession();
      expect(sessionBefore).not.toBeNull();
      
      await revokeCurrentSession();
      
      // Cookie is deleted by the revoke function, but even if it was present, the DB row is revoked
      const sessionAfter = await resolveSession();
      expect(sessionAfter).toBeNull();
    });
  });

  describe('Backend Authorization Migration', () => {
    it('13. getCurrentUser returns User from native session', async () => {
      await createSession(user.id);
      const currentUser = await getCurrentUser();
      expect(currentUser).not.toBeNull();
      expect(currentUser?.id).toBe(user.id);
    });

    it('14. getCurrentUser returns null when no session exists', async () => {
      const currentUser = await getCurrentUser();
      expect(currentUser).toBeNull();
    });

    it('15. requireAuth throws when no session exists', async () => {
      await expect(requireAuth()).rejects.toThrow('Unauthorized');
    });

    it('16. requireAuth returns User when valid session exists', async () => {
      await createSession(user.id);
      const authUser = await requireAuth();
      expect(authUser.id).toBe(user.id);
    });

    it('17. checkPermission denies without session', async () => {
      const hasPerm = await checkPermission('USER', 'READ');
      expect(hasPerm).toBe(false);
    });
  });
});
