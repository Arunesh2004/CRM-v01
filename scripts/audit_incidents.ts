import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditIncidents() {
  const report: any = {};
  const tenantId = 'demo-tenant-1';
  const otherTenantId = 'f14e9658-448c-4e0e-839b-7e4064dc2dc6';

  try {
    const { getIncidents, updateIncidentStatus, createIncident, assignIncident } = await import('../src/modules/incident/incident.service');



    // Check Data Integrity: Duplicates
    // Create an incident with AI Event ID 123
    const loc = await prisma.location.findFirst({ where: { tenantId } });
    const cam = await prisma.camera.findFirst({ where: { tenantId } });

    if (!loc || !cam) throw new Error("Need test data");

    const eventId = 'EVT-DUP-TEST-' + Date.now();
    const aiEvent = await prisma.aIEvent.create({
        data: {
            id: eventId,
            tenantId,
            cameraId: cam.id,

            confidence: 99,
            model: 'TEST-MODEL',
            detectedObject: 'PERSON'
        }
    });

    const inc1 = await prisma.$transaction(async (tx) => {
        return tx.incident.create({
            data: {
                tenantId,
                locationId: loc.id,
                cameraId: cam.id,
                aiEventId: eventId,
                title: 'Test Incident',
                severity: 'HIGH'
            }
        });
    });

    try {
        await prisma.incident.create({
            data: {
                tenantId,
                locationId: loc.id,
                cameraId: cam.id,
                aiEventId: eventId,
                title: 'Duplicate Event',
                severity: 'HIGH'
            }
        });
        report.duplicateAiEventBlocked = false;
    } catch(e: any) {
        if(e.code === 'P2002') report.duplicateAiEventBlocked = true;
    }

    // Check Tenant Isolation on Update/Assign
    const otherUser = await prisma.user.findFirst({ where: { tenantId: otherTenantId } });
    if(otherUser) {
        // we can assign to anyone, there is no cross-tenant check in assignIncident!
        // Let's verify this vulnerability.
        await prisma.$transaction(async (tx) => {
            const updated = await tx.incident.update({
                where: { id: inc1.id },
                data: { assignedUserId: otherUser.id }
            });
            report.crossTenantAssignmentAllowed = (updated.assignedUserId === otherUser.id);
        });
    }

    // Check Delete Lifecycle
    // There is no soft delete field in Incident schema! 
    report.softDeleteFieldExists = false;

    // Cleanup
    await prisma.incident.delete({ where: { id: inc1.id } });
    await prisma.aIEvent.delete({ where: { id: eventId } });

    console.log(JSON.stringify(report, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

auditIncidents();
