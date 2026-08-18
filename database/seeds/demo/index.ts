import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Demo Data...');
  
  // 1. Clear existing data (optional, maybe we just want to ensure Acme exists)
  // For demo safety, we will just upsert the Acme tenant
  
  const tenant = await prisma.tenant.upsert({
    where: { id: 'demo-tenant-1' },
    update: {},
    create: {
      id: 'demo-tenant-1',
      name: 'Acme Security Solutions',
      status: 'ACTIVE'
    }
  });

  console.log(`Created Tenant: ${tenant.name}`);

  // Create Users
  const admin = await prisma.user.upsert({
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

  // Create Customers
  const cust1 = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: 'Stark Industries',
      normalizedName: 'stark industries',
      industry: 'Defense',
      status: 'ACTIVE'
    }
  });

  const cust2 = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: 'Wayne Enterprises',
      normalizedName: 'wayne enterprises',
      industry: 'Conglomerate',
      status: 'ACTIVE'
    }
  });

  const cust3 = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: 'Oscorp',
      normalizedName: 'oscorp',
      industry: 'Biotech',
      status: 'ACTIVE'
    }
  });

  // Create Leads
  for (let i = 0; i < 5; i++) {
    await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        name: `Lead Contact ${i}`,
        company: `Prospect Company ${i}`,
        status: i % 2 === 0 ? 'NEW' : 'CONTACTED'
      }
    });
  }

  // Create Locations
  const loc1 = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      customerId: cust1.id,
      name: 'Headquarters',
      city: 'New York'
    }
  });
  
  const loc2 = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      customerId: cust2.id,
      name: 'Gotham Branch',
      city: 'Gotham'
    }
  });

  // Create Cameras
  const cam1 = await prisma.camera.create({
    data: {
      tenantId: tenant.id,
      locationId: loc1.id,
      name: 'Front Gate',
      protocol: 'RTSP',
      ipAddress: '192.168.1.10',
      status: 'ONLINE'
    }
  });

  const cam2 = await prisma.camera.create({
    data: {
      tenantId: tenant.id,
      locationId: loc2.id,
      name: 'Warehouse Entrance',
      protocol: 'RTSP',
      ipAddress: '192.168.1.11',
      status: 'OFFLINE'
    }
  });

  const cam3 = await prisma.camera.create({
    data: {
      tenantId: tenant.id,
      locationId: loc1.id,
      name: 'Lobby',
      protocol: 'ONVIF',
      ipAddress: '192.168.1.12',
      status: 'ONLINE'
    }
  });

  // Create AI Events and Incidents
  const ev1 = await prisma.aIEvent.create({
    data: {
      tenantId: tenant.id,
      cameraId: cam1.id,
      model: 'YOLOv8',
      confidence: 0.95,
      detectedObject: 'Vehicle'
    }
  });

  await prisma.incident.create({
    data: {
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

  const ev2 = await prisma.aIEvent.create({
    data: {
      tenantId: tenant.id,
      cameraId: cam2.id,
      model: 'YOLOv8',
      confidence: 0.89,
      detectedObject: 'Person'
    }
  });

  await prisma.incident.create({
    data: {
      tenantId: tenant.id,
      title: 'Motion in Restricted Area',
      severity: 'CRITICAL',
      status: 'INVESTIGATING',
      locationId: loc2.id,
      cameraId: cam2.id,
      aiEventId: ev2.id
    }
  });

  const ev3 = await prisma.aIEvent.create({
    data: {
      tenantId: tenant.id,
      cameraId: cam1.id,
      model: 'YOLOv8',
      confidence: 0.92,
      detectedObject: 'Person'
    }
  });

  await prisma.incident.create({
    data: {
      tenantId: tenant.id,
      title: 'Perimeter Breach',
      severity: 'HIGH',
      status: 'RESOLVED',
      resolvedAt: new Date(),
      locationId: loc1.id,
      cameraId: cam1.id,
      aiEventId: ev3.id
    }
  });

  // Create Communications
  await prisma.notification.create({
    data: {
      tenantId: tenant.id,
      userId: admin.id,
      type: 'ALERT',
      title: 'Email Sent to Security Team',
      body: 'Automated email dispatch for Incident #1'
    }
  });

  await prisma.notification.create({
    data: {
      tenantId: tenant.id,
      userId: admin.id,
      type: 'SYSTEM',
      title: 'SMS Sent to Facility Manager',
      body: 'Automated SMS dispatch for Incident #2'
    }
  });

  console.log('Demo Seeding Complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
