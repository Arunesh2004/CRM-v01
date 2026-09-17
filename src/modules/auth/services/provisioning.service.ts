import { Logger } from '@/lib/logger/logger';
import type { User as ClerkUser } from '@clerk/nextjs/server';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';

 
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
export async function ensureUserProvisioned(clerkUser: ClerkUser | any) {
  // Normalize user data handling both Clerk SDK User object and Webhook payload
  const id = clerkUser.id;
  
  // Extract email carefully based on whether it's SDK camelCase or Webhook snake_case
  let email = '';
  if (clerkUser.primaryEmailAddressId && clerkUser.emailAddresses) {
    const primary = clerkUser.emailAddresses.find((e: { id: string, emailAddress: string }) => e.id === clerkUser.primaryEmailAddressId);
    if (primary) email = primary.emailAddress;
  } else if (clerkUser.primary_email_address_id && clerkUser.email_addresses) {
    const primary = clerkUser.email_addresses.find((e: { id: string, email_address: string }) => e.id === clerkUser.primary_email_address_id);
    if (primary) email = primary.email_address;
  }
  
  if (!email) {
    Logger.warn('[Provisioning] Clerk user has no email', { id });
    return null;
  }

  return synchronizeClerkIdentity(id, email);
}

export async function synchronizeClerkIdentity(clerkId: string, emailStr: string) {
  const email = emailStr.toLowerCase().trim();

  // 1. Find the user locally by exact email lookup
  // We must bypass RLS here because we do not know the tenant context yet
  const user = await executeAsSystem(SystemOperation.CLERK_PROVISIONING, async (tx) => {
    return tx.user.findFirst({
      where: { email: email }
    });
  });

  // Log identity sync context
  Logger.info('[AUTH_DIAGNOSTIC] identity synchronization:', {
    email_lookup: user ? 'FOUND' : 'NOT_FOUND',
    stored_clerk_id_match: user ? (user.clerkId === clerkId ? 'YES' : 'NO') : 'N/A',
    stored_clerk_id_null: user ? (user.clerkId === null ? 'YES' : 'NO') : 'N/A'
  });

  // 2. Reject unknown accounts
  if (!user) {
    Logger.warn('[Provisioning] Unknown account login denied', { email: email.replace(/(?<=.).(?=.*@)/g, '*') });
    Logger.info('[AUTH_DIAGNOSTIC] identity synchronization result:', { result: 'NOT_FOUND' });
    return null; // Deny entry
  }

  // 3. User exists. Check status
  if (user.status === 'INACTIVE') {
     Logger.warn('[Provisioning] Inactive user login denied', { email: email.replace(/(?<=.).(?=.*@)/g, '*') });
     Logger.info('[AUTH_DIAGNOSTIC] identity synchronization result:', { result: 'REJECTED' });
     return null;
  }

  // 4. If status is INVITED, deny entry. They MUST use the token flow.
  if (user.status === 'INVITED') {
     Logger.warn('[Provisioning] Unredeemed invited user linking denied', { email: email.replace(/(?<=.).(?=.*@)/g, '*') });
     Logger.info('[AUTH_DIAGNOSTIC] identity synchronization result:', { result: 'REJECTED' });
     return null;
  }

  // 5. If status is ACTIVE, verify identity matches
  if (user.status === 'ACTIVE') {
     if (user.clerkId === clerkId) {
        Logger.info('[AUTH_DIAGNOSTIC] identity synchronization result:', { result: 'MATCHED' });
        return user;
     } else if (user.clerkId === null) {
        // Bind the identity for pre-provisioned/seeded users
        await executeAsSystem(SystemOperation.CLERK_PROVISIONING, async (tx) => {
          await tx.user.update({
            where: { id: user.id },
            data: { clerkId: clerkId }
          });
        });
        Logger.info(`[Provisioning] Bound clerkId ${clerkId} to pre-provisioned user ${user.id}`);
        Logger.info('[AUTH_DIAGNOSTIC] identity synchronization result:', { result: 'BOUND' });
        return { ...user, clerkId };
     } else {
        Logger.warn(`[Provisioning] Identity Reassignment Denied`, { expected: user.clerkId, got: clerkId });
        Logger.info('[AUTH_DIAGNOSTIC] identity synchronization result:', { result: 'REJECTED' });
        return null;
     }
  }

  Logger.info('[AUTH_DIAGNOSTIC] identity synchronization result:', { result: 'ERROR' });
  return null;
}
