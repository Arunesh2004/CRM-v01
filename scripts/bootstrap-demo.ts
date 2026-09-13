import { Action, Resource } from '@prisma/client';
import crypto from 'crypto';
import { enforceDemoSafetyGuard } from './utils/demo-safety';
import { seedDemoTenant } from './seed-demo-tenant';
import { executeAsSystem, SystemOperation } from '../database/utils/prisma-system';

async function main() {
  enforceDemoSafetyGuard();

  const args = process.argv.slice(2);
  const companyName = args.find(a => a.startsWith('--company='))?.split('=')[1] || "CRM Client Demo";
  const adminEmail = (args.find(a => a.startsWith('--email='))?.split('=')[1] || "demo@company.com").toLowerCase().trim();
  const adminName = args.find(a => a.startsWith('--name='))?.split('=')[1] || "Demo Admin";

  console.log(`[Bootstrap Demo] Starting safe deployment for: ${companyName}`);

  const allowedResources: Resource[] = ['CUSTOMER', 'LEAD', 'REVENUE', 'TICKET', 'TASK', 'COMMUNICATION', 'INCIDENT'];
  const allowedActions: Action[] = ['CREATE', 'READ', 'UPDATE', 'DELETE'];
  
  const result = await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
    // 1. Setup permissions
    const permissions = [];
    for (const res of allowedResources) {
      for (const act of allowedActions) {
        const p = await tx.permission.upsert({
          where: { resource_action: { resource: res, action: act } },
          update: {},
          create: { resource: res, action: act }
        });
        permissions.push(p);
      }
    }
    const camPerm = await tx.permission.upsert({
      where: { resource_action: { resource: 'CAMERA', action: 'READ' } },
      update: {},
      create: { resource: 'CAMERA', action: 'READ' }
    });
    permissions.push(camPerm);

    // 2. Identity and tenant setup
    const existingUser = await tx.user.findFirst({
      where: { email: adminEmail },
      include: { tenant: true }
    });

    let tenantId: string;
    let demoUserId: string;
    let employeeId: string;

    if (existingUser) {
      if (existingUser.tenant.name !== companyName || existingUser.tenant.ownerId !== existingUser.id) {
        throw new Error(`Fatal: User ${adminEmail} exists but belongs to an unexpected tenant or is not the owner. Aborting to prevent takeover.`);
      }
      console.log(`[Bootstrap Demo] Recovering existing demo tenant: ${existingUser.tenant.id}`);
      tenantId = existingUser.tenant.id;
      demoUserId = existingUser.id;
      employeeId = existingUser.employeeId;
    } else {
      const tenant = await tx.tenant.create({
        data: { name: companyName, status: 'ACTIVE' }
      });
      tenantId = tenant.id;

      await tx.tenantBootstrap.create({
        data: { tenantId }
      });

      const department = await tx.department.create({
        data: { name: 'Demo Team', tenantId }
      });

      employeeId = `DEMO-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const [firstName, ...lastNames] = adminName.split(' ');
      const lastName = lastNames.join(' ');

      const demoUser = await tx.user.create({
        data: {
          email: adminEmail,
          employeeId,
          firstName,
          lastName,
          tenantId,
          departmentId: department.id,
          clerkId: `clerk_${crypto.randomBytes(4).toString('hex')}`,
          status: 'ACTIVE',
          onboardingStatus: 'COMPLETED'
        }
      });
      demoUserId = demoUser.id;

      await tx.tenant.update({
        where: { id: tenantId },
        data: { ownerId: demoUserId }
      });
    }

    // 3. Create or Update DEMO_USER role
    let demoRole = await tx.role.findFirst({
      where: { tenantId, name: 'DEMO_USER' }
    });

    if (!demoRole) {
      demoRole = await tx.role.create({
        data: {
          name: 'DEMO_USER',
          tenantId
        }
      });
    }

    for (const p of permissions) {
      await tx.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: demoRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: demoRole.id, permissionId: p.id, tenantId }
      });
    }

    const prohibitedPerms = await tx.rolePermission.findMany({
      where: {
        roleId: demoRole.id,
        permission: {
          resource: { in: ['SYSTEM', 'USER'] }
        }
      }
    });

    if (prohibitedPerms.length > 0) {
      throw new Error("Fatal: DEMO_USER role contains prohibited administrative permissions. Aborting.");
    }

    await tx.userRole.upsert({
      where: { userId_roleId: { userId: demoUserId, roleId: demoRole.id } },
      update: {},
      create: { userId: demoUserId, roleId: demoRole.id, tenantId }
    });

    return { tenantId, email: adminEmail, employeeId, demoRoleId: demoRole.id };
  });

  console.log(`[Bootstrap Demo] Tenant & Role setup complete. Moving to Seeding...`);
  
  await seedDemoTenant(result.tenantId, result.demoRoleId);

  console.log(`[Bootstrap Demo] Success!`);
  console.log(`Tenant ID: ${result.tenantId}`);
}

export { main as runBootstrapDemo };

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(`[Bootstrap Demo] FAILED: ${e.message}`);
      process.exit(1);
    });
}
