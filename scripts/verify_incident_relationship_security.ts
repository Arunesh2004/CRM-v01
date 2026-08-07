import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runSecurityVerification() {
  const report: any = {};
  
  try {
    const tenantA = 'demo-tenant-1';
    const tenantB = 'f14e9658-448c-4e0e-839b-7e4064dc2dc6';

    const userA = await prisma.user.findFirst({ where: { tenantId: tenantA } });
    if (!userA) throw new Error("Missing user A");

    process.env.TEST_CLERK_ID = userA.clerkId;
    const { createIncident } = await import('../src/modules/incident/incident.service');

    // Retrieve or seed entities
    const camA = await prisma.camera.findFirst({ where: { tenantId: tenantA } });
    const locA = await prisma.location.findFirst({ where: { id: camA?.locationId, tenantId: tenantA } });
    const locB = await prisma.location.findFirst({ where: { tenantId: tenantB } });
    const camB = await prisma.camera.findFirst({ where: { tenantId: tenantB } });

    if (!locA || !camA || !locB || !camB) throw new Error("Missing entities");

    const aiEventIdA = 'EVT-SEC-A-' + Date.now();
    await prisma.aIEvent.create({ data: { id: aiEventIdA, tenantId: tenantA, cameraId: camA.id, confidence: 99, model: 'TEST', detectedObject: 'PERSON' } });

    const aiEventIdB = 'EVT-SEC-B-' + Date.now();
    await prisma.aIEvent.create({ data: { id: aiEventIdB, tenantId: tenantB, cameraId: camB.id, confidence: 99, model: 'TEST', detectedObject: 'PERSON' } });

    // Test 2: Tenant A incident with Tenant B location
    try {
      await createIncident({ locationId: locB.id, cameraId: camA.id, aiEventId: aiEventIdA, title: 'T2', description: 'desc', severity: 'HIGH' });
      report.test2_ForeignLocation = "FAILED (Allowed)";
    } catch(e: any) {
      report.test2_ForeignLocation = e.message.includes('Location') ? "PASS" : `FAIL - ${e.message}`;
    }

    // Test 3: Tenant A incident with Tenant B camera
    try {
      await createIncident({ locationId: camA?.locationId as string, cameraId: camB.id, aiEventId: aiEventIdA, title: 'T3', description: 'desc', severity: 'HIGH' });
      report.test3_ForeignCamera = "FAILED (Allowed)";
    } catch(e: any) {
      report.test3_ForeignCamera = e.message.includes('Camera') ? "PASS" : `FAIL - ${e.message}`;
    }

    // Test 4: Tenant A incident with Tenant B AIEvent
    try {
      await createIncident({ locationId: camA?.locationId as string, cameraId: camA.id, aiEventId: aiEventIdB, title: 'T4', description: 'desc', severity: 'HIGH' });
      report.test4_ForeignAIEvent = "FAILED (Allowed)";
    } catch(e: any) {
      report.test4_ForeignAIEvent = e.message.includes('AIEvent') ? "PASS" : `FAIL - ${e.message}`;
    }

    // Seed mismatched relationships for T5, T6
    // Camera A2 belongs to Tenant A, but linked to Location B (simulate bad DB state)
    // Actually, prisma schema restricts this? Let's just pass incorrect combinations
    // Test 5: Camera/Location mismatch
    // CamA belongs to LocA. Pass LocA2 and CamA.
    const locA2 = await prisma.location.create({ data: { tenantId: tenantA, customerId: locA.customerId, name: 'Loc A2' } });
    try {
      await createIncident({ locationId: locA2.id, cameraId: camA.id, aiEventId: aiEventIdA, title: 'T5', description: 'desc', severity: 'HIGH' });
      report.test5_CameraLocationMismatch = "FAILED (Allowed)";
    } catch(e: any) {
      report.test5_CameraLocationMismatch = e.message.includes('Relationship Consistency') ? "PASS" : `FAIL - ${e.message}`;
    }

    // Test 6: AIEvent/Camera mismatch
    const camA2 = await prisma.camera.create({ data: { tenantId: tenantA, locationId: locA.id, name: 'Cam A2', status: 'ONLINE', ipAddress: '0.0.0.0', protocol: 'ONVIF' } });
    try {
      await createIncident({ locationId: camA?.locationId as string, cameraId: camA2.id, aiEventId: aiEventIdA, title: 'T6', description: 'desc', severity: 'HIGH' });
      report.test6_AIEventCameraMismatch = "FAILED (Allowed)";
    } catch(e: any) {
      report.test6_AIEventCameraMismatch = e.message.includes('Relationship Consistency') ? "PASS" : `FAIL - ${e.message}`;
    }

    // Test 1: Valid
    const aiEventIdA3 = 'EVT-SEC-A3-' + Date.now();
    await prisma.aIEvent.create({ data: { id: aiEventIdA3, tenantId: tenantA, cameraId: camA.id, confidence: 99, model: 'TEST', detectedObject: 'PERSON' } });
    try {
      const inc = await createIncident({ locationId: camA?.locationId as string, cameraId: camA.id, aiEventId: aiEventIdA3, title: 'T1 Valid', description: 'desc', severity: 'HIGH' });
      report.test1_ValidCreation = inc.id ? "PASS" : "FAILED (No ID)";
    } catch(e: any) {
      report.test1_ValidCreation = `FAILED - ${e.message}`;
    }

    console.log(JSON.stringify(report, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

runSecurityVerification();
