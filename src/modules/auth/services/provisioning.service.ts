import prisma from '@/../database/utils/prisma';
import type { User } from '@clerk/nextjs/server';

export async function ensureUserProvisioned(clerkUser: User | any) {
  // Normalize user data handling both Clerk SDK User object and Webhook payload
  const id = clerkUser.id;
  
  // Extract email carefully based on whether it's SDK camelCase or Webhook snake_case
  let email = '';
  if (clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
    email = clerkUser.emailAddresses[0].emailAddress;
  } else if (clerkUser.email_addresses && clerkUser.email_addresses.length > 0) {
    email = clerkUser.email_addresses[0].email_address;
  }
  
  const firstName = clerkUser.firstName || clerkUser.first_name || '';
  const publicMetadata = clerkUser.publicMetadata || clerkUser.public_metadata || {};
  let tenantId = publicMetadata.tenantId as string | undefined;

  console.log(`[Provisioning] Ensuring user ${id} (${email}) is provisioned.`);

  // 1. Idempotency Check: Fast path, no transaction if user exists.
  const existingUser = await prisma.user.findUnique({
    where: { clerkId: id }
  });

  if (existingUser) {
    console.log(`[Provisioning] User ${id} already exists in DB. Skip provisioning.`);
    return existingUser;
  }

  // 2. Transactional Upsert for initial provisioning
  try {
    const user = await prisma.$transaction(async (tx) => {
      let tenant;
      
      if (!tenantId) {
        // Provision a new tenant safely.
        tenant = await tx.tenant.create({
          data: {
            name: `${firstName || 'User'}'s Organization`
          }
        });
        tenantId = tenant.id;
        console.log(`[Provisioning] Created new tenant ${tenantId}.`);
      } else {
        // Verify tenant exists
        tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) throw new Error('Invalid tenantId provided in metadata');
      }

      // Upsert User to handle concurrent webhooks/logins safely
      const upsertedUser = await tx.user.upsert({
        where: { clerkId: id },
        update: {}, // Do nothing if it exists (idempotent)
        create: {
          clerkId: id,
          email: email,
          tenantId: tenant.id
        }
      });
      console.log(`[Provisioning] Upserted user ${upsertedUser.id}.`);

      // Find or create role
      const roleName = publicMetadata.tenantId ? 'MEMBER' : 'TENANT_ADMIN';
      let role = await tx.role.findFirst({
        where: { name: roleName, tenantId: tenant.id }
      });
      
      if (!role) {
        role = await tx.role.create({
          data: { name: roleName, tenantId: tenant.id }
        });
        console.log(`[Provisioning] Created role ${roleName}.`);
      }

      // Upsert User Role to handle concurrency safely
      const existingUserRole = await tx.userRole.findFirst({
        where: { userId: upsertedUser.id, roleId: role.id }
      });
      
      if (!existingUserRole) {
        await tx.userRole.create({
          data: {
            userId: upsertedUser.id,
            roleId: role.id
          }
        });
        console.log(`[Provisioning] Assigned role ${roleName} to user.`);
      }

      return upsertedUser;
    }, {
      // Isolation level and retry can be added here if needed, but standard transaction is fine for now
      maxWait: 5000,
      timeout: 10000,
    });
    
    return user;
  } catch (err: any) {
    console.error(`[Provisioning] Failed to provision user ${id}:`, err);
    throw err;
  }
}
