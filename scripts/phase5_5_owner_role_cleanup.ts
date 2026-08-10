import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('[Cleanup] Starting OWNER role migration...');
  
  try {
    // 1. Find all OWNER roles
    const ownerRoles = await prisma.role.findMany({
      where: { name: 'OWNER' }
    });

    console.log(`[Cleanup] Found ${ownerRoles.length} OWNER roles in the database.`);

    let migratedUsers = 0;

    for (const role of ownerRoles) {
      // Find the corresponding TENANT_ADMIN role for this tenant, or create it
      let adminRole = await prisma.role.findFirst({
        where: { name: 'TENANT_ADMIN', tenantId: role.tenantId }
      });

      if (!adminRole) {
        adminRole = await prisma.role.create({
          data: { name: 'TENANT_ADMIN', tenantId: role.tenantId }
        });
      }

      // Find all users with this OWNER role
      const userRoles = await prisma.userRole.findMany({
        where: { roleId: role.id }
      });

      for (const ur of userRoles) {
        // Migrate to TENANT_ADMIN
        // Upsert to handle potential duplicates safely
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: ur.userId, roleId: adminRole.id } },
          update: {},
          create: { userId: ur.userId, roleId: adminRole.id }
        });

        // Delete old mapping
        await prisma.userRole.delete({
          where: { userId_roleId: { userId: ur.userId, roleId: role.id } }
        });
        migratedUsers++;
      }

      // 3. Delete the empty OWNER role
      await prisma.role.delete({
        where: { id: role.id }
      });
    }

    console.log(`[Cleanup] Migration complete. Migrated ${migratedUsers} users from OWNER to TENANT_ADMIN.`);
    
  } catch (e) {
    console.error('[Cleanup] Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
