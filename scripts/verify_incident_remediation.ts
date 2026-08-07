import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runVerification() {
  const report: any = {};
  const tenantId = 'demo-tenant-1';
  const otherTenantId = 'f14e9658-448c-4e0e-839b-7e4064dc2dc6';

  try {
    const adminUser = await prisma.user.findFirst({ where: { tenantId } });
    if (!adminUser) throw new Error('Missing user for tenant');
    
    // Ensure user has a role to bypass permissions
    const role = await prisma.role.findFirst({ where: { name: 'TENANT_ADMIN' } });
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: adminUser.id, roleId: role.id } },
        create: { userId: adminUser.id, roleId: role.id },
        update: {}
      });
    }

    process.env.TEST_CLERK_ID = adminUser.clerkId;
    const { getIncidents, updateIncidentStatus, createIncident, assignIncident, deleteIncident } = await import('../src/modules/incident/incident.service');

    const loc = await prisma.location.findFirst({ where: { tenantId } });
    const cam = await prisma.camera.findFirst({ where: { tenantId } });
    if (!loc || !cam) throw new Error('Missing location or camera in DB');

    // 1. Seed verification (BUG-INC-001)
    const seedIncident = await prisma.incident.findFirst({ where: { title: 'Perimeter Breach', status: 'RESOLVED', tenantId } });
    if (seedIncident) {
        report.seedResolvedAtPopulated = seedIncident.resolvedAt !== null;
    }

    // 2. Create mock incident for lifecycle test
    const aiEventId = 'EVT-TEST-' + Date.now();
    await prisma.aIEvent.create({
        data: {
            id: aiEventId,
            tenantId,
            cameraId: cam.id,
            confidence: 99,
            model: 'TEST-MODEL',
            detectedObject: 'PERSON'
        }
    });

    const inc = await prisma.$transaction(async (tx) => {
        return await tx.incident.create({
            data: {
                tenantId,
                title: 'Test Flow Incident',
                severity: 'HIGH',
                status: 'OPEN',
                locationId: loc.id,
                cameraId: cam.id,
                aiEventId
            }
        });
    });

    // 3. Security Assignment Check (BUG-INC-003)
    const otherUser = await prisma.user.findFirst({ where: { tenantId: otherTenantId } });
    if (otherUser) {
        try {
            await assignIncident({ id: inc.id, assignedUserId: otherUser.id });
            report.crossTenantAssignmentBlocked = false;
        } catch (e: any) {
            if (e.message === 'Assigned user does not belong to this tenant.') {
                report.crossTenantAssignmentBlocked = true;
            } else {
                report.crossTenantAssignmentBlocked = false;
                report.assignmentError = e.message;
            }
        }
    }

    // Check successful assignment works
    const sameTenantUser = await prisma.user.findFirst({ where: { tenantId } });
    if (sameTenantUser) {
        await assignIncident({ id: inc.id, assignedUserId: sameTenantUser.id });
        const updatedInc = await prisma.incident.findUnique({ where: { id: inc.id } });
        report.sameTenantAssignmentSucceeded = updatedInc?.assignedUserId === sameTenantUser.id;
    }

    // 4. Status updates (BUG-INC-001 dynamic verify)
    await updateIncidentStatus({ id: inc.id, status: 'RESOLVED' });
    let check = await prisma.incident.findUnique({ where: { id: inc.id } });
    report.resolvedPopulatesResolvedAt = check?.resolvedAt !== null;

    await updateIncidentStatus({ id: inc.id, status: 'OPEN' });
    check = await prisma.incident.findUnique({ where: { id: inc.id } });
    report.reopenClearsResolvedAt = check?.resolvedAt === null;

    // 5. Soft Delete Check (BUG-INC-004)
    await deleteIncident(inc.id);
    check = await prisma.incident.findUnique({ where: { id: inc.id } });
    report.softDeletePopulatesDeletedAt = check?.deletedAt !== null;

    // Check list filtration
    const allIncidents = await getIncidents();
    report.deletedIncidentExcludedFromList = !allIncidents.some(i => i.id === inc.id);

    // Cross-tenant delete validation (simulated by modifying service query behavior test)
    try {
        const inc2 = await prisma.incident.findFirst({ where: { tenantId: otherTenantId } });
        if (inc2) {
            await deleteIncident(inc2.id); // This will fail because deleteIncident uses tenantId in query
            report.crossTenantDeleteBlocked = false;
        } else {
            report.crossTenantDeleteBlocked = 'No other tenant incident to test';
        }
    } catch(e: any) {
        if(e.message === 'Incident not found') {
            report.crossTenantDeleteBlocked = true;
        } else {
            report.crossTenantDeleteBlocked = e.message;
        }
    }

    console.log(JSON.stringify(report, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
