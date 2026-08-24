import { PrismaClient } from '@prisma/client';
import { executeAsSystem, SystemOperation } from '../../utils/prisma-system';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Demo Data...');
  
  await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
    const tenant = await tx.tenant.upsert({
      where: { id: 'demo-tenant-1' },
      update: {},
      create: {
        id: 'demo-tenant-1',
        name: 'Acme Security Solutions',
        status: 'ACTIVE'
      }
    });

    console.log(`Created Tenant: ${tenant.name}`);

    const admin = await tx.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'admin@acmesecurity.com' } },
      update: {},
      create: {
        email: 'admin@acmesecurity.com',
        clerkId: 'demo-clerk-admin',
        employeeId: 'EMP-DEMO1234',
        tenantId: tenant.id,
        status: 'ACTIVE',
        onboardingStatus: 'COMPLETED'
      }
    });

    const demoUser = await tx.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'demo@company.com' } },
      update: {},
      create: {
        email: 'demo@company.com',
        clerkId: 'demo-clerk',
        employeeId: 'EMP-DEMO001',
        tenantId: tenant.id,
        status: 'ACTIVE',
        onboardingStatus: 'COMPLETED'
      }
    });

    let demoRole = await tx.role.findFirst({ where: { tenantId: tenant.id, name: 'DEMO_VIEWER' } });
    if (!demoRole) {
      demoRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'DEMO_VIEWER',
        }
      });
    }

    const demoPerm = await tx.permission.findFirst();
    if (demoPerm) {
      const existingRP = await tx.rolePermission.findFirst({ where: { roleId: demoRole.id, permissionId: demoPerm.id } });
      if (!existingRP) {
        await tx.rolePermission.create({
          data: {
            roleId: demoRole.id,
            permissionId: demoPerm.id,
            tenantId: tenant.id
          }
        });
      }
    }

    const existingUR = await tx.userRole.findFirst({ where: { userId: demoUser.id, roleId: demoRole.id } });
    if (!existingUR) {
      await tx.userRole.create({
        data: {
          userId: demoUser.id,
          roleId: demoRole.id,
          tenantId: tenant.id
        }
      });
    }

    const cust1 = await tx.customer.upsert({
      where: { id: 'cust-demo-1' },
      update: {},
      create: {
        id: 'cust-demo-1',
        tenantId: tenant.id,
        name: 'Stark Industries',
        normalizedName: 'stark industries',
        industry: 'Defense',
        status: 'ACTIVE'
      }
    });

    const cust2 = await tx.customer.upsert({
      where: { id: 'cust-demo-2' },
      update: {},
      create: {
        id: 'cust-demo-2',
        tenantId: tenant.id,
        name: 'Wayne Enterprises',
        normalizedName: 'wayne enterprises',
        industry: 'Conglomerate',
        status: 'ACTIVE'
      }
    });

    for (let i = 0; i < 5; i++) {
      await tx.lead.upsert({
        where: { id: `lead-demo-${i}` },
        update: {},
        create: {
          id: `lead-demo-${i}`,
          tenantId: tenant.id,
          name: `Lead Contact ${i}`,
          company: `Prospect Company ${i}`,
          status: i % 2 === 0 ? 'NEW' : 'CONTACTED'
        }
      });
    }

    const loc1 = await tx.location.upsert({
      where: { id: 'loc-demo-1' },
      update: {},
      create: {
        id: 'loc-demo-1',
        tenantId: tenant.id,
        customerId: cust1.id,
        name: 'Headquarters',
        city: 'New York'
      }
    });
    
    const cam1 = await tx.camera.upsert({
      where: { id: 'cam-demo-1' },
      update: {},
      create: {
        id: 'cam-demo-1',
        tenantId: tenant.id,
        locationId: loc1.id,
        name: 'Front Gate',
        protocol: 'RTSP',
        ipAddress: '192.168.1.10',
        status: 'ONLINE'
      }
    });

    const ev1 = await tx.aIEvent.upsert({
      where: { id: 'aievent-demo-1' },
      update: {},
      create: {
        id: 'aievent-demo-1',
        tenantId: tenant.id,
        cameraId: cam1.id,
        model: 'YOLOv8',
        confidence: 0.95,
        detectedObject: 'Vehicle'
      }
    });

    await tx.incident.upsert({
      where: { id: 'inc-demo-1' },
      update: {},
      create: {
        id: 'inc-demo-1',
        tenantId: tenant.id,
        title: 'Unauthorized Vehicle Detected',
        severity: 'HIGH',
        status: 'OPEN',
        locationId: loc1.id,
        cameraId: cam1.id,
        aiEventId: ev1.id,
        assignedUserId: admin.id
      }
    });

    await tx.notification.upsert({
      where: { id: 'notif-demo-1' },
      update: {},
      create: {
        id: 'notif-demo-1',
        tenantId: tenant.id,
        userId: admin.id,
        type: 'ALERT',
        title: 'Email Sent to Security Team',
        body: 'Automated email dispatch for Incident #1'
      }
    });

    console.log('Demo Seeding Complete!');
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
