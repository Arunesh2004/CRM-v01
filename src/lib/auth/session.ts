import { cookies } from 'next/headers';
import crypto from 'crypto';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { AuthUser } from '@/lib/auth';

const SESSION_COOKIE_NAME = 'crm_session';
const SESSION_EXPIRATION_DAYS = 7;

/**
 * Creates a high-entropy session token, hashes it, stores the hash in the DB,
 * and sets the plaintext token in a secure HttpOnly cookie.
 */
export async function createSession(userId: string): Promise<void> {
  // Generate 32 bytes (256 bits) of high-entropy random data
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

  const expiresAt = new Date(Date.now() + SESSION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

  // Store only the hash in the database
  await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
    return tx.authSession.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      }
    });
  });

  // Set the secure HttpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

/**
 * Resolves the current session from the HttpOnly cookie.
 * Verifies existence, expiration, and revocation status before returning the CRM User.
 */
export async function resolveSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) return null;

  const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

  const sessionData = await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
    return tx.authSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            tenant: true,
            userRoles: {
              include: { role: { include: { permissions: { include: { permission: true } } } } }
            }
          }
        }
      }
    });
  });

  if (!sessionData) return null;
  if (sessionData.expiresAt < new Date()) return null;
  if (sessionData.revokedAt) return null;

  // Verify the user is in an authentication-allowed state
  if (sessionData.user.status !== 'ACTIVE') return null;

  // Verify the session was not issued before the password was last changed
  if (sessionData.user.passwordChangedAt && sessionData.createdAt < sessionData.user.passwordChangedAt) {
    return null;
  }

  return sessionData.user as unknown as AuthUser;
}

/**
 * Revokes the current session by setting revokedAt on the current session token.
 */
export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) return;

  const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

  await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
    return tx.authSession.update({
      where: { tokenHash },
      data: { revokedAt: new Date() }
    });
  });

  cookieStore.delete(SESSION_COOKIE_NAME);
}
