import { PrismaClient, Action, Resource } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const companyName = args.find(a => a.startsWith('--company='))?.split('=')[1];
  const adminEmail = args.find(a => a.startsWith('--email='))?.split('=')[1];
  const adminName = args.find(a => a.startsWith('--name='))?.split('=')[1];

  if (!companyName || !adminEmail || !adminName) {
    console.error('Usage: npx tsx scripts/bootstrap-demo.ts --company="CRM Client Demo" --email="demo@company.com" --name="Demo User"');
    process.exit(1);
  }

  console.log(`[Bootstrap Demo] Starting safe deployment for: ${companyName}`);

    // Resolve required permissions
    const allowedResources: Resource[] = ['CUSTOMER', 'LEAD', 'REVENUE', 'TICKET', 'TASK', 'COMMUNICATION', 'INCIDENT'];
    const allowedActions: Action[] = ['CREATE', 'READ', 'UPDATE', 'DELETE'];
    
    // Ensure permissions exist before assigning (done outside tx to avoid pooler issues)
    const permissions = [];
    for (const res of allowedResources) {
      for (const act of allowedActions) {
        const p = await prisma.permission.upsert({
          where: { resource_action: { resource: res, action: act } },
          update: {},
          create: { resource: res, action: act }
        });
        permissions.push(p);
      }
    }
    const camPerm = await prisma.permission.upsert({
      where: { resource_action: { resource: 'CAMERA', action: 'READ' } },
      update: {},
      create: { resource: 'CAMERA', action: 'READ' }
    });
    permissions.push(camPerm);

  // 1. Transactional hierarchy creation
  const result = await prisma.$transaction(async (tx) => {
    // Check if duplicate tenant name exists (fail safe)
    const existingTenant = await tx.tenant.findFirst({ where: { name: companyName } });
    if (existingTenant) {
      throw new Error(`Tenant '${companyName}' already exists.`);
    }

    // Check if duplicate email exists
    const existingUser = await tx.user.findFirst({ where: { email: adminEmail.toLowerCase().trim() } });
    if (existingUser) {
      throw new Error(`Email '${adminEmail}' already exists.`);
    }

    // Create Tenant
    const tenant = await tx.tenant.create({
      data: { name: companyName }
    });

    await tx.tenantBootstrap.create({
      data: { tenantId: tenant.id }
    });

    const department = await tx.department.create({
      data: { name: 'Demo Team', tenantId: tenant.id }
    });

    // Create DEMO_USER role
    const demoRole = await tx.role.create({
      data: {
        name: 'DEMO_USER',
        tenantId: tenant.id,
        permissions: {
          create: permissions.map(p => ({ permissionId: p.id, tenantId: tenant.id }))
        }
      }
    });

    const empId = `DEMO-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const [firstName, ...lastNames] = adminName.split(' ');
    const lastName = lastNames.join(' ');

    // Create Demo User
    const demoUser = await tx.user.create({
      data: {
        email: adminEmail.toLowerCase().trim(),
        employeeId: empId,
        firstName,
        lastName,
        tenantId: tenant.id,
        departmentId: department.id,
        status: 'INVITED', // Needs clerk linking
        onboardingStatus: 'PENDING',
        userRoles: {
          create: { roleId: demoRole.id, tenantId: tenant.id }
        }
      }
    });

    // Link Tenant Owner
    await tx.tenant.update({
      where: { id: tenant.id },
      data: { ownerId: demoUser.id }
    });

    return { tenantId: tenant.id, email: demoUser.email, employeeId: demoUser.employeeId };
  });

  console.log(`[Bootstrap Demo] Success!`);
  console.log(`Tenant ID: ${result.tenantId}`);
}

main()
  .catch((e) => {
    console.error(`[Bootstrap Demo] FAILED: ${e.message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
