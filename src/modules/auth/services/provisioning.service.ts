import prisma from '@/../database/utils/prisma';
import type { User as ClerkUser } from '@clerk/nextjs/server';
import { ENV } from '@/lib/config/env';
import crypto from 'crypto';

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
  const canonicalTenantId = ENV.companyTenantId;

  // 1. Find the user locally
  const user = await prisma.user.findFirst({
    where: {
      tenantId: canonicalTenantId,
      email: email
    }
  });

  // 2. If no user, check for Atomic Bootstrap
  if (!user) {
    if (email === ENV.initialAdminEmail) {
       console.log(`[Provisioning] Evaluating Initial Admin Bootstrap for ${email}`);
       try {
         await prisma.$transaction(async (tx) => {
            // Lock the tenant row serially
            const tenants: any[] = await tx.$queryRaw`SELECT id FROM "Tenant" WHERE id = ${canonicalTenantId} FOR UPDATE`;
            if (tenants.length === 0) {
               throw new Error(`CRITICAL: Canonical tenant ${canonicalTenantId} not found.`);
            }

            // Check if bootstrap exists
            const bootstrap = await tx.tenantBootstrap.findUnique({
              where: { tenantId: canonicalTenantId }
            });

            // Check if any users exist
            const userCount = await tx.user.count({
              where: { tenantId: canonicalTenantId }
            });

            if (!bootstrap && userCount === 0) {
               console.log(`[Provisioning] Executing Initial Admin Bootstrap for ${email}`);
               // Create bootstrap record
               await tx.tenantBootstrap.create({
                 data: { tenantId: canonicalTenantId }
               });

               const empId = `EMP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

               // Ensure TENANT_ADMIN role exists
               let adminRole = await tx.role.findFirst({
                 where: { name: 'TENANT_ADMIN', tenantId: canonicalTenantId }
               });
               if (!adminRole) {
                  adminRole = await tx.role.create({
                    data: { name: 'TENANT_ADMIN', tenantId: canonicalTenantId }
                  });
               }

               await tx.user.create({
                 data: {
                   clerkId,
                   email,
                   employeeId: empId,
                   tenantId: canonicalTenantId,
                   status: 'ACTIVE',
                   onboardingStatus: 'PENDING',
                   userRoles: {
                     create: { roleId: adminRole.id }
                   }
                 }
               });
            }
         });
         
         const bootstrappedUser = await prisma.user.findFirst({
           where: { tenantId: canonicalTenantId, email }
         });
         if (bootstrappedUser) return bootstrappedUser;

       } catch (error) {
         console.error('[Provisioning] Bootstrap transaction failed/aborted:', error);
       }
    }
    
    // If not bootstrap, DENY
    console.warn(`[Provisioning] Unknown Gmail ${email} attempted to login. Denied.`);
    return null;
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
