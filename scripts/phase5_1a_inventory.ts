import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runInventory() {
  const report: any = {
    cross_tenant_results: {}
  };

  try {
    const tenantAId = 'p51a-tenant-alpha';
    const tenantBId = 'p51a-tenant-beta';

    await prisma.tenant.upsert({ where: { id: tenantAId }, update: {}, create: { id: tenantAId, name: 'Alpha' } });
    await prisma.tenant.upsert({ where: { id: tenantBId }, update: {}, create: { id: tenantBId, name: 'Beta' } });

    // Entities in Tenant B
    const custB = await prisma.customer.upsert({ where: { tenantId_normalizedName: { tenantId: tenantBId, normalizedName: 'cust-b' } }, update: {}, create: { tenantId: tenantBId, name: 'CB', normalizedName: 'cust-b' } });
    
    // We'll clean up Location because of unique name if applicable
    await prisma.location.deleteMany({ where: { name: 'Loc B' } });
    const locB = await prisma.location.create({ data: { tenantId: tenantBId, customerId: custB.id, name: 'Loc B', address: 'Addr' } });
    
    const camB = await prisma.camera.create({ data: { tenantId: tenantBId, locationId: locB.id, name: 'Cam B', ipAddress: '0.0.0.0', protocol: 'RTSP' } });
    const aiEvtB = await prisma.aIEvent.create({ data: { tenantId: tenantBId, cameraId: camB.id, model: 'M', confidence: 0.9, detectedObject: 'O' } });
    
    const userB = await prisma.user.upsert({ where: { clerkId: 'uB' }, update: {}, create: { tenantId: tenantBId, clerkId: 'uB', email: 'ub@test.com' } });
    const convB = await prisma.conversation.create({ data: { tenantId: tenantBId, type: 'WHATSAPP', customerId: custB.id } });
    const leadB = await prisma.lead.create({ data: { tenantId: tenantBId, name: 'Lead_' + Date.now(), company: 'Co' } });
    
    const planB = await prisma.plan.findFirst() || await prisma.plan.create({ data: { name: 'P', price: 10, billingCycle: 'MONTHLY', limits: {}, features: {} }});
    const subB = await prisma.subscription.create({ data: { tenantId: tenantBId, planId: planB.id, startDate: new Date(), endDate: new Date(), renewalDate: new Date() }});
    const invB = await prisma.invoice.create({ data: { tenantId: tenantBId, subscriptionId: subB.id, amount: 10, finalAmount: 10, status: 'PAID', invoiceNumber: 'INV-' + Date.now() }});
    
    const taskB = await prisma.task.create({ data: { tenantId: tenantBId, customerId: custB.id, title: 'T', dueDate: new Date() }});

    // NOW ATTEMPT TO CREATE CROSS-TENANT RELATIONS FOR TENANT A
    
    async function attempt(name: string, p: Promise<any>) {
      try {
        await p;
        report.cross_tenant_results[name] = 'VULNERABLE'; // Created successfully!
      } catch (e: any) {
        report.cross_tenant_results[name] = 'REJECTED: ' + e.message.substring(0, 200);
      }
    }

    // Incident -> LocationB, CameraB, AIEventB
    await attempt('Incident -> LocationB, CameraB, AIEventB', 
      prisma.incident.create({ data: { tenantId: tenantAId, locationId: locB.id, cameraId: camB.id, aiEventId: aiEvtB.id, title: 'Inc', severity: 'HIGH' }})
    );

    // Camera -> LocationB
    await attempt('Camera -> LocationB', 
      prisma.camera.create({ data: { tenantId: tenantAId, locationId: locB.id, name: 'Cam', ipAddress: '1', protocol: 'RTSP' }})
    );
    
    // Message -> ConversationB
    await attempt('Message -> ConversationB', 
      prisma.message.create({ data: { tenantId: tenantAId, conversationId: convB.id, content: 'Msg', status: 'QUEUED', idempotencyKey: Date.now().toString() }})
    );

    // Notification -> UserB
    await attempt('Notification -> UserB', 
      prisma.notification.create({ data: { tenantId: tenantAId, userId: userB.id, type: 'ALERT', title: 'T', content: 'C' }})
    );

    // Call -> Participant(UserB)
    await attempt('CallParticipant -> UserB', 
      prisma.call.create({ data: { tenantId: tenantAId, provider: 'TWILIO', providerId: 'pid', status: 'COMPLETED', participants: { create: [{ tenantId: tenantAId, userId: userB.id, phoneNumber: '2' }] } }})
    );

    // Task -> UserB (AssignedUser)
    await attempt('Task -> UserB', 
      prisma.task.create({ data: { tenantId: tenantAId, customerId: custB.id /* cross tenant cust */, assignedUserId: userB.id, title: 'T', dueDate: new Date() }})
    );

    console.log(JSON.stringify(report, null, 2));

  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

runInventory();
