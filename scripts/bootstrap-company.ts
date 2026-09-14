import crypto from 'crypto';
import { executeAsSystem, SystemOperation } from '../database/utils/prisma-system';

async function main() {
  const args = process.argv.slice(2);
  const companyName = args.find(a => a.startsWith('--company='))?.split('=')[1];
  const adminEmail = args.find(a => a.startsWith('--admin-email='))?.split('=')[1];
  const adminName = args.find(a => a.startsWith('--admin-name='))?.split('=')[1];

  if (!companyName || !adminEmail || !adminName) {
    console.error('Usage: npx tsx scripts/bootstrap-company.ts --company="Company Name" --admin-email="admin@company.com" --admin-name="John Doe"');
    process.exit(1);
  }

  const [firstName, ...lastNames] = adminName.split(' ');
  const lastName = lastNames.join(' ');
  const emailLower = adminEmail.toLowerCase().trim();

  console.log(`[Bootstrap] Starting deployment for: ${companyName}`);

  await executeAsSystem(SystemOperation.CLERK_PROVISIONING, async (tx) => {
    // Acquire an exclusive table lock to prevent concurrent duplicates across tenants
    await tx.$executeRawUnsafe(`LOCK TABLE "Tenant", "User", "Role", "Department" IN EXCLUSIVE MODE`);

    // 1. Check existing tenant
    const existingTenants = await tx.tenant.findMany({ where: { name: companyName } });
    if (existingTenants.length > 1) throw new Error('PROVISIONING_CONFLICT_DUPLICATE_TENANTS');
    
    // 2. Check existing user
    const existingUsers = await tx.user.findMany({ where: { email: emailLower }, include: { tenant: true } });
    if (existingUsers.length > 1) throw new Error('PROVISIONING_CONFLICT_DUPLICATE_USERS');

    const existingTenant = existingTenants[0];
    const existingUser = existingUsers[0];

    // Conflict resolution
    if (existingUser && existingTenant && existingUser.tenantId !== existingTenant.id) {
      throw new Error('PROVISIONING_CONFLICT_USER_BELONGS_TO_OTHER_TENANT');
    }
    if (existingUser && !existingTenant) {
      if (existingUser.tenant.name !== companyName) {
         throw new Error('PROVISIONING_CONFLICT_USER_BELONGS_TO_OTHER_TENANT');
      }
    }

    // Provision or reconcile Tenant
    let tenantId = existingTenant?.id;
    if (!existingTenant) {
      const tenant = await tx.tenant.create({ data: { name: companyName } });
      tenantId = tenant.id;
      await tx.tenantBootstrap.create({ data: { tenantId } });
    } else {
       // Check if bootstrap record exists
       const bs = await tx.tenantBootstrap.findUnique({ where: { tenantId } });
       if (!bs) await tx.tenantBootstrap.create({ data: { tenantId } });
    }

    // Provision or reconcile Department
    let department = await tx.department.findFirst({ where: { tenantId, name: 'Executive' } });
    if (!department) {
      department = await tx.department.create({ data: { name: 'Executive', tenantId } });
    }

    // Provision or reconcile Role
    let adminRole = await tx.role.findFirst({ where: { tenantId, name: 'TENANT_ADMIN' } });
    if (!adminRole) {
      adminRole = await tx.role.create({ data: { name: 'TENANT_ADMIN', tenantId } });
    }

    // Provision or reconcile User
    let userId = existingUser?.id;
    if (!existingUser) {
      const empId = `EMP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const admin = await tx.user.create({
        data: {
          email: emailLower,
          employeeId: empId,
          firstName,
          lastName,
          tenantId,
          departmentId: department.id,
          status: 'ACTIVE',
          onboardingStatus: 'PENDING',
          userRoles: { create: { roleId: adminRole.id, tenantId } }
        }
      });
      userId = admin.id;
    } else {
       // Ensure role is attached
       const userRole = await tx.userRole.findFirst({ where: { userId, roleId: adminRole.id } });
       if (!userRole) {
         await tx.userRole.create({ data: { userId, roleId: adminRole.id, tenantId } });
       }
    }

    // Link Tenant Owner
    const currentTenant = await tx.tenant.findUnique({ where: { id: tenantId }});
    if (currentTenant?.ownerId !== userId) {
       await tx.tenant.update({ where: { id: tenantId }, data: { ownerId: userId } });
    }

    console.log(`[Bootstrap] Success!`);
    console.log(`Secure First-Company Provisioning Complete (Idempotent)`);
    console.log(`Tenant ID: ${tenantId}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
