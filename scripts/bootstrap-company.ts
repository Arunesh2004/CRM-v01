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

  console.log(`[Bootstrap] Starting deployment for: ${companyName}`);

  await executeAsSystem(SystemOperation.CLERK_PROVISIONING, async (tx) => {
    // Acquire an exclusive table lock to prevent concurrent duplicates across tenants
    await tx.$executeRawUnsafe(`LOCK TABLE "User" IN EXCLUSIVE MODE`);

    // Check if user exists
    const existingUser = await tx.user.findFirst({
      where: { email: adminEmail.toLowerCase().trim() },
      include: { tenant: true }
    });

    if (existingUser) {
      throw new Error('PROVISIONING_CONFLICT_EMAIL_EXISTS');
    }

    // Create Tenant
    const tenant = await tx.tenant.create({
      data: {
        name: companyName,
      }
    });

    // Create Bootstrap Record
    await tx.tenantBootstrap.create({
      data: { tenantId: tenant.id }
    });

    // Create Initial Department
    const department = await tx.department.create({
      data: {
        name: 'Executive',
        tenantId: tenant.id
      }
    });

    // Ensure TENANT_ADMIN role
    const adminRole = await tx.role.create({
      data: { name: 'TENANT_ADMIN', tenantId: tenant.id }
    });

    // Generate EMP ID
    const empId = `EMP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const [firstName, ...lastNames] = adminName.split(' ');
    const lastName = lastNames.join(' ');

    // Create Initial Admin User
    const admin = await tx.user.create({
      data: {
        email: adminEmail.toLowerCase().trim(),
        employeeId: empId,
        firstName,
        lastName,
        tenantId: tenant.id,
        departmentId: department.id,
        status: 'ACTIVE', // Test 3 requires ACTIVE
        onboardingStatus: 'PENDING',
        userRoles: {
          create: { roleId: adminRole.id, tenantId: tenant.id }
        }
      }
    });

    // Link Tenant Owner
    await tx.tenant.update({
      where: { id: tenant.id },
      data: { ownerId: admin.id }
    });

    console.log(`[Bootstrap] Success!`);
    console.log(`Secure First-Company Provisioning Complete`);
    console.log(`Tenant ID: ${tenant.id}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
