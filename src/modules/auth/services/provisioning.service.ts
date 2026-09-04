import { Logger } from '@/lib/logger/logger';
import prisma from '@db/utils/prisma';
import type { User as ClerkUser } from '@clerk/nextjs/server';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';

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

  // 2. Reject unknown accounts
  if (!user) {
    Logger.warn('[Provisioning] Unknown account login denied', { email: email.replace(/(?<=.).(?=.*@)/g, '*') });
    return null; // Deny entry
  }

  // 3. User exists. Check status
  if (user.status === 'INACTIVE') {
     Logger.warn('[Provisioning] Inactive user login denied', { email: email.replace(/(?<=.).(?=.*@)/g, '*') });
     return null;
  }

  // 4. If status is INVITED, deny entry. They MUST use the token flow.
  if (user.status === 'INVITED') {
     Logger.warn('[Provisioning] Unredeemed invited user linking denied', { email: email.replace(/(?<=.).(?=.*@)/g, '*') });
     return null;
  }

  // 5. If status is ACTIVE, verify identity matches
  if (user.status === 'ACTIVE') {
     if (user.clerkId === clerkId) {
        return user;
     } else {
        Logger.warn(`[Provisioning] Identity Reassignment Denied`, { expected: user.clerkId, got: clerkId });
        return null;
     }
  }

  return null;
}
