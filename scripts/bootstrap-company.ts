import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

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

  // Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: companyName,
    }
  });

  // Create Bootstrap Record
  await prisma.tenantBootstrap.create({
    data: { tenantId: tenant.id }
  });

  // Create Initial Department
  const department = await prisma.department.create({
    data: {
      name: 'Executive',
      tenantId: tenant.id
    }
  });

  // Ensure TENANT_ADMIN role
  const adminRole = await prisma.role.create({
    data: { name: 'TENANT_ADMIN', tenantId: tenant.id }
  });

  // Generate EMP ID
  const empId = `EMP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const [firstName, ...lastNames] = adminName.split(' ');
  const lastName = lastNames.join(' ');

  // Create Initial Admin User
  const admin = await prisma.user.create({
    data: {
      email: adminEmail.toLowerCase().trim(),
      employeeId: empId,
      firstName,
      lastName,
      tenantId: tenant.id,
      departmentId: department.id,
      status: 'INVITED', // They will link clerkId on first login
      onboardingStatus: 'PENDING',
      userRoles: {
        create: { roleId: adminRole.id }
      }
    }
  });

  // Link Tenant Owner
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { ownerId: admin.id }
  });

  console.log(`[Bootstrap] Success!`);
  console.log(`Tenant ID: ${tenant.id}`);
  console.log(`Admin Email: ${admin.email}`);
  console.log(`Admin Employee ID: ${admin.employeeId}`);
  console.log(`The admin can now log in via Google to complete onboarding.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
