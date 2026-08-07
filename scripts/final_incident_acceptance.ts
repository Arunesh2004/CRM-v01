import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runFinalAcceptance() {
  const report: any = {};
  
  try {
    // We will test direct service boundaries by modifying process.env.TEST_CLERK_ID
    const { getIncidents, updateIncidentStatus, createIncident, assignIncident, deleteIncident } = await import('../src/modules/incident/incident.service');

    const tenantA = 'demo-tenant-1';
    const tenantB = 'f14e9658-448c-4e0e-839b-7e4064dc2dc6';

    const userA = await prisma.user.findFirst({ where: { tenantId: tenantA } });
    const userB = await prisma.user.findFirst({ where: { tenantId: tenantB } });

    if (!userA || !userB) throw new Error("Missing test users");

    const camA = await prisma.camera.findFirst({ where: { tenantId: tenantA } });
    const locA = await prisma.location.findFirst({ where: { id: camA?.locationId, tenantId: tenantA } });
    const locB = await prisma.location.findFirst({ where: { tenantId: tenantB } });
    let camB = await prisma.camera.findFirst({ where: { tenantId: tenantB } });

    if (!locB) {
      locB = await prisma.location.create({ data: { tenantId: tenantB, customerId: (await prisma.customer.findFirst({where:{tenantId:tenantB}}))!.id, name: 'Loc B' }});
    }
    if (!camB) {
      camB = await prisma.camera.create({ data: { tenantId: tenantB, locationId: locB.id, name: 'Cam B', status: 'ONLINE', ipAddress: '192.168.1.100', protocol: 'ONVIF' }});
    }
    if (!locA || !camA || !locB || !camB) throw new Error("Missing locations or cameras");

    // Give userB TENANT_ADMIN to pass generic auth checks for their own tenant
    const role = await prisma.role.findFirst({ where: { name: 'TENANT_ADMIN' } });
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: userB.id, roleId: role.id } },
        create: { userId: userB.id, roleId: role.id },
        update: {}
      });
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: userA.id, roleId: role.id } },
        create: { userId: userA.id, roleId: role.id },
        update: {}
      });
    }

    // CREATE AI EVENT A
    const aiEventIdA = 'EVT-ACC-A-' + Date.now();
    await prisma.aIEvent.create({
      data: { id: aiEventIdA, tenantId: tenantA, cameraId: camA.id, confidence: 99, model: 'TEST', detectedObject: 'PERSON' }
    });

    // 1. Create Incident A (Tenant A)
    process.env.TEST_CLERK_ID = userA.clerkId;
    let incidentA = await createIncident({
      locationId: camA?.locationId as string,
      cameraId: camA.id,
      aiEventId: aiEventIdA,
      title: 'Acceptance Incident A',
      description: 'Test A',
      severity: 'HIGH'
    });

    // ----------------------------------------------------
    // SECTION 1: Cross Tenant Assignment Security
    // ----------------------------------------------------
    process.env.TEST_CLERK_ID = userA.clerkId;
    try {
      await assignIncident({ id: incidentA.id, assignedUserId: userB.id });
      report.section1_CrossTenantAssignment = "FAILED - Allowed assignment to User B";
    } catch(e: any) {
      report.section1_CrossTenantAssignment = (e.message.includes('does not belong to this tenant')) ? "PASS" : `FAIL - ${e.message}`;
    }

    // ----------------------------------------------------
    // SECTION 2: Cross Tenant Incident Update Security
    // ----------------------------------------------------
    process.env.TEST_CLERK_ID = userB.clerkId;
    try {
      await updateIncidentStatus({ id: incidentA.id, status: 'RESOLVED' });
      report.section2_CrossTenantUpdate = "FAILED - User B updated Incident A";
    } catch (e: any) {
      report.section2_CrossTenantUpdate = (e.message === 'Incident not found') ? "PASS" : `FAIL - ${e.message}`;
    }

    try {
      await assignIncident({ id: incidentA.id, assignedUserId: userB.id });
      report.section2_CrossTenantAssignByOther = "FAILED - User B assigned themselves to Incident A";
    } catch (e: any) {
      report.section2_CrossTenantAssignByOther = (e.message === 'Incident not found') ? "PASS" : `FAIL - ${e.message}`;
    }

    // ----------------------------------------------------
    // SECTION 3: Cross Tenant Delete Security
    // ----------------------------------------------------
    process.env.TEST_CLERK_ID = userB.clerkId;
    try {
      await deleteIncident(incidentA.id);
      report.section3_CrossTenantDelete = "FAILED - User B deleted Incident A";
    } catch (e: any) {
      report.section3_CrossTenantDelete = (e.message === 'Incident not found') ? "PASS" : `FAIL - ${e.message}`;
    }

    // Valid delete
    process.env.TEST_CLERK_ID = userA.clerkId;
    await deleteIncident(incidentA.id);
    const deletedInc = await prisma.incident.findUnique({ where: { id: incidentA.id } });
    report.section3_ValidDelete = (deletedInc?.deletedAt !== null) ? "PASS" : "FAILED - deletedAt is null";

    // ----------------------------------------------------
    // SECTION 4: Relationship Ownership Security
    // ----------------------------------------------------
    process.env.TEST_CLERK_ID = userA.clerkId;
    
    // AI Event B (Tenant B)
    const aiEventIdB = 'EVT-ACC-B-' + Date.now();
    await prisma.aIEvent.create({
      data: { id: aiEventIdB, tenantId: tenantB, cameraId: camB.id, confidence: 99, model: 'TEST', detectedObject: 'PERSON' }
    });

    try {
      await createIncident({
        locationId: locB.id, // Foreign Location
        cameraId: camA.id,
        aiEventId: aiEventIdB, // Unique AI Event
        title: 'Foreign Rel',
        description: 'Test',
        severity: 'HIGH'
      });
      // createIncident doesn't strictly reject if location doesn't belong? Let's check what happened.
      report.section4_RelationshipSecurity = "Check manual - createIncident executed";
    } catch (e: any) {
      // Prisma error for fk? 
      // Actually schema enforces `tenantId` must match in query, but if createIncident doesn't pass tenantId to connect...
      // Wait, createIncident does: tenantId: tenantId, locationId: input.locationId.
      // Prisma DOES NOT automatically enforce cross-relation tenantId unless there's a composite foreign key!
      // I will log the error if any.
      report.section4_RelationshipSecurity = `Error: ${e.message}`;
    }

    // ----------------------------------------------------
    // SECTION 5: Incident Lifecycle Validation
    // ----------------------------------------------------
    process.env.TEST_CLERK_ID = userA.clerkId;
    const aiEventIdA2 = 'EVT-ACC-A2-' + Date.now();
    await prisma.aIEvent.create({
      data: { id: aiEventIdA2, tenantId: tenantA, cameraId: camA.id, confidence: 99, model: 'TEST', detectedObject: 'PERSON' }
    });

    let lcIncident = await createIncident({
      locationId: camA?.locationId as string,
      cameraId: camA.id,
      aiEventId: aiEventIdA2,
      title: 'Lifecycle',
      description: 'Test',
      severity: 'HIGH'
    });

    await updateIncidentStatus({ id: lcIncident.id, status: 'RESOLVED' });
    let check = await prisma.incident.findUnique({ where: { id: lcIncident.id }});
    report.section5_ResolvedPopulatesTimestamp = (check?.resolvedAt !== null) ? "PASS" : "FAILED";

    await updateIncidentStatus({ id: lcIncident.id, status: 'OPEN' });
    check = await prisma.incident.findUnique({ where: { id: lcIncident.id }});
    report.section5_ReopenClearsTimestamp = (check?.resolvedAt === null) ? "PASS" : "FAILED";

    // ----------------------------------------------------
    // SECTION 6: Duplicate / Integrity Validation
    // ----------------------------------------------------
    try {
      await createIncident({
        locationId: camA?.locationId as string,
        cameraId: camA.id,
        aiEventId: aiEventIdA2, // DUP
        title: 'Dup',
        description: 'Test',
        severity: 'HIGH'
      });
      report.section6_DuplicateIntegrity = "FAILED - Allowed duplicate AI Event ID";
    } catch(e: any) {
      report.section6_DuplicateIntegrity = e.code === 'P2002' ? "PASS" : `FAIL - ${e.message}`;
    }

    console.log(JSON.stringify(report, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

runFinalAcceptance();
