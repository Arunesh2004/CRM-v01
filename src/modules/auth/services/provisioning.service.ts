import prisma from '@/../database/utils/prisma';
import type { User as ClerkUser } from '@clerk/nextjs/server';
import { executeAsSystem, SystemOperation } from '@/../database/utils/prisma-system';

export async function ensureUserProvisioned(clerkUser: ClerkUser | any) {
  // Normalize user data handling both Clerk SDK User object and Webhook payload
  const id = clerkUser.id;
  
  // Extract email carefully based on whether it's SDK camelCase or Webhook snake_case
  let email = '';
  if (clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
    email = clerkUser.emailAddresses[0].emailAddress;
  } else if (clerkUser.email_addresses && clerkUser.email_addresses.length > 0) {
    email = clerkUser.email_addresses[0].email_address;
  }
  
  if (!email) {
    console.warn(`[Provisioning] Clerk user ${id} has no email. Skipping.`);
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
    console.warn(`[Provisioning] Unknown Google Account ${email} attempted to login. Denied.`);
    return null; // Deny entry
  }

  // 3. User exists. Check status
  if (user.status === 'INACTIVE') {
     console.warn(`[Provisioning] Inactive user ${email} attempted to login. Denied.`);
     return null;
  }

  // 4. If status is INVITED (clerkId is null), link them atomically
  if (user.status === 'INVITED') {
     const { count } = await prisma.user.updateMany({
       where: {
         id: user.id,
         clerkId: { equals: null },
         status: 'INVITED'
       },
       data: {
         clerkId: clerkId,
         status: 'ACTIVE'
       }
     });

     if (count === 1) {
       console.log(`[Provisioning] Successfully linked clerkId to invited user ${email}`);
       
       const { createAuditLog } = await import('../../audit/audit.service');
       await createAuditLog({
         tenantId: user.tenantId,
         actorId: user.id,
         action: 'EMPLOYEE_ACTIVATED',
         resource: 'USER',
         resourceId: user.id
       });

       return { ...user, clerkId, status: 'ACTIVE' };
     } else {
       // Race condition: someone else linked it, or status changed
       const refreshedUser = await prisma.user.findUnique({ where: { id: user.id } });
       if (!refreshedUser || refreshedUser.status === 'INACTIVE') return null;
       if (refreshedUser.clerkId === clerkId) return refreshedUser;
       return null;
     }
  }

  // 5. If status is ACTIVE, verify identity matches
  if (user.status === 'ACTIVE') {
     if (user.clerkId === clerkId) {
        return user;
     } else {
        console.warn(`[Provisioning] Identity Reassignment Denied for ${email}. Expected ${user.clerkId}, got ${clerkId}`);
        return null;
     }
  }

  return null;
}
