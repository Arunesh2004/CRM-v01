import { PrismaClient, Resource, Action } from '@prisma/client';
import { ENV } from '../src/lib/config/env';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING BOOTSTRAP ---');

  const tenantId = ENV.companyTenantId;
  
  if (!tenantId) {
    throw new Error('CRITICAL: COMPANY_TENANT_ID is not configured in the environment.');
  }

  // Idempotent Tenant Creation
  const tenant = await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {}, // Do nothing if it already exists
    create: {
      id: tenantId,
      name: 'Canonical Company',
      status: 'ACTIVE',
    },
  });
  console.log(`Verified Canonical Tenant: ${tenant.id}`);

  // Ensure necessary global roles exist within the canonical tenant
  const roles = ['TENANT_ADMIN', 'DEPARTMENT_HEAD', 'MEMBER'];
  
  for (const roleName of roles) {
    const role = await prisma.role.findFirst({
      where: { name: roleName, tenantId: tenant.id },
    });
    
    if (!role) {
      await prisma.role.create({
        data: {
          name: roleName,
          tenantId: tenant.id,
        },
      });
      console.log(`Created required role: ${roleName}`);
    } else {
      console.log(`Verified role exists: ${roleName}`);
    }
  }

  // Assign baseline permissions for functional roles
  const rolePermissionsMap: Record<string, { resource: Resource, actions: Action[] }[]> = {
    DEPARTMENT_HEAD: [
      { resource: Resource.USER, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE] },
      { resource: Resource.CUSTOMER, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE] },
      { resource: Resource.LEAD, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE] },
      { resource: Resource.TASK, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE] },
      { resource: Resource.COMMUNICATION, actions: [Action.CREATE, Action.READ] },
      { resource: Resource.SYSTEM, actions: [Action.READ] }
    ],
    MEMBER: [
      { resource: Resource.USER, actions: [Action.READ] },
      { resource: Resource.CUSTOMER, actions: [Action.CREATE, Action.READ, Action.UPDATE] },
      { resource: Resource.LEAD, actions: [Action.CREATE, Action.READ, Action.UPDATE] },
      { resource: Resource.TASK, actions: [Action.CREATE, Action.READ, Action.UPDATE] },
      { resource: Resource.COMMUNICATION, actions: [Action.CREATE, Action.READ] },
      { resource: Resource.SYSTEM, actions: [Action.READ] }
    ]
  };

  for (const [roleName, permissions] of Object.entries(rolePermissionsMap)) {
    const role = await prisma.role.findFirst({ where: { name: roleName, tenantId: tenant.id } });
    if (role) {
      for (const { resource, actions } of permissions) {
        for (const action of actions) {
          const perm = await prisma.permission.upsert({
            where: { resource_action: { resource, action } },
            update: {},
            create: { resource, action }
          });
          await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
            update: {},
            create: { roleId: role.id, permissionId: perm.id, tenantId: tenant.id }
          });
        }
      }
      console.log(`Assigned baseline permissions to ${roleName}`);
    }
  }

  // Seed initial administrators and internal test emails
  const adminEmails = [...ENV.initialAdminEmails, ...ENV.internalTestEmails];
  // Deduplicate array
  const uniqueAdmins = Array.from(new Set(adminEmails));

  if (uniqueAdmins.length > 0) {
    for (const adminEmail of uniqueAdmins) {
      const isInternal = ENV.internalTestEmails.includes(adminEmail);
      const adminUser = await prisma.user.upsert({
        where: {
          tenantId_email: { tenantId: tenant.id, email: adminEmail }
        },
        update: {}, // Idempotent: don't overwrite if exists
        create: {
          email: adminEmail,
          tenantId: tenant.id,
          status: 'INVITED',
          onboardingStatus: 'PENDING',
          firstName: isInternal ? 'Internal' : 'System',
          lastName: isInternal ? 'Tester' : 'Administrator',
        }
      });
      console.log(`Verified Admin/Test User exists: ${adminUser.email}`);

      // Fetch TENANT_ADMIN role and link to adminUser
      const adminRole = await prisma.role.findFirst({
        where: { name: 'TENANT_ADMIN', tenantId: tenant.id }
      });

      if (adminRole) {
        await prisma.userRole.upsert({
          where: {
            userId_roleId: { userId: adminUser.id, roleId: adminRole.id }
          },
          update: {},
          create: {
            userId: adminUser.id,
            roleId: adminRole.id,
            tenantId: tenant.id
          }
        });
        console.log(`Verified Admin/Test User has TENANT_ADMIN role: ${adminEmail}`);
      } else {
        console.error(`ERROR: Could not find TENANT_ADMIN role to assign to ${adminEmail}`);
      }
    }
  } else {
    console.log('NOTICE: No admin or internal test emails set. Skipping admin user creation.');
  }

  // --- DEMO TENANT BOOTSTRAP ---
  if (!ENV.isProduction && ENV.demoAccountEmail) {
    const demoEmail = ENV.demoAccountEmail;
    // We use a deterministic UUID for the demo tenant so it doesn't conflict with random IDs
    const demoTenantId = 'd3m00000-0000-4000-a000-000000000000';
    const demoTenant = await prisma.tenant.upsert({
      where: { id: demoTenantId },
      update: {},
      create: {
        id: demoTenantId,
        name: 'Demo Company',
        status: 'ACTIVE',
      }
    });
    console.log(`Verified Demo Tenant: ${demoTenant.id}`);

    // Create DEMO_VIEWER role
    let demoRole = await prisma.role.findFirst({
      where: { name: 'DEMO_VIEWER', tenantId: demoTenant.id },
    });

    if (!demoRole) {
      demoRole = await prisma.role.create({
        data: {
          name: 'DEMO_VIEWER',
          tenantId: demoTenant.id,
        },
      });
      console.log(`Created required role: DEMO_VIEWER in Demo Tenant`);
    }

    // Assign strictly READ permissions for all resources
    const resources = Object.values(Resource);
    for (const res of resources) {
      const perm = await prisma.permission.upsert({
        where: { resource_action: { resource: res, action: Action.READ } },
        update: {},
        create: { resource: res, action: Action.READ }
      });

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: demoRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: demoRole.id, permissionId: perm.id, tenantId: demoTenant.id }
      });
    }
    console.log(`Assigned READ permissions to DEMO_VIEWER role.`);

    // Provision the Demo User
    const demoUser = await prisma.user.upsert({
      where: {
        tenantId_email: { tenantId: demoTenant.id, email: demoEmail }
      },
      update: {},
      create: {
        email: demoEmail,
        tenantId: demoTenant.id,
        status: 'INVITED',
        onboardingStatus: 'COMPLETED', // Skip onboarding for demo
        firstName: 'Demo',
        lastName: 'User',
      }
    });
    console.log(`Verified Demo User exists: ${demoUser.email}`);

    // Assign DEMO_VIEWER role to Demo User
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: demoUser.id, roleId: demoRole.id }
      },
      update: {},
      create: {
        userId: demoUser.id,
        roleId: demoRole.id,
        tenantId: demoTenant.id
      }
    });

    // Seed realistic but fake demo data (if not exists)
    const existingLeads = await prisma.lead.count({ where: { tenantId: demoTenant.id } });
    if (existingLeads === 0) {
      await prisma.lead.createMany({
        data: [
          { tenantId: demoTenant.id, name: 'John Doe', company: 'Acme Corp', email: 'john@acmecorp.fake', status: 'NEW' },
          { tenantId: demoTenant.id, name: 'Jane Smith', company: 'Globex', email: 'jane@globex.fake', status: 'QUALIFIED' },
          { tenantId: demoTenant.id, name: 'Bob Johnson', company: 'Initech', email: 'bob@initech.fake', status: 'CONTACTED' },
        ]
      });
      console.log(`Seeded 3 fake leads into Demo Tenant.`);
    }

    const existingCustomers = await prisma.customer.count({ where: { tenantId: demoTenant.id } });
    if (existingCustomers === 0) {
      await prisma.customer.createMany({
        data: [
          { tenantId: demoTenant.id, name: 'Stark Industries', normalizedName: 'stark industries', status: 'ACTIVE' },
          { tenantId: demoTenant.id, name: 'Wayne Enterprises', normalizedName: 'wayne enterprises', status: 'ACTIVE' },
        ]
      });
      console.log(`Seeded 2 fake customers into Demo Tenant.`);
    }
  }

  console.log('--- BOOTSTRAP COMPLETE ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
