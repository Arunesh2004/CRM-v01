import { PrismaClient } from '@prisma/client';
import { createIncident } from '../src/modules/incident/incident.service';
import { createCamera } from '../src/modules/cctv/camera.service';
import { sendMessage } from '../src/modules/communication/messaging/messaging.service';
import { createNotification } from '../src/modules/communication/notification/notification.service';
import { assignTask } from '../src/modules/crm/task/task.service';

const prisma = new PrismaClient();

// Manual mock for auth context
import * as auth from '../src/lib/auth';
import * as tenantContext from '../src/lib/tenant-context';

(auth as any).requireAuth = async () => ({ id: process.env.TEST_USER_ID });
(auth as any).requireTenant = async () => process.env.TEST_TENANT_ID;
(auth as any).requirePermission = async () => true;

(tenantContext as any).getCurrentUserContext = async () => ({ id: process.env.TEST_USER_ID, tenantId: process.env.TEST_TENANT_ID });

async function runVerification() {
  const report: any = {
    results: {}
  };

  try {
    const tenantAId = 'p51b-tenant-alpha';
    const tenantBId = 'p51b-tenant-beta';

    await prisma.tenant.upsert({ where: { id: tenantAId }, update: {}, create: { id: tenantAId, name: 'Alpha' } });
    await prisma.tenant.upsert({ where: { id: tenantBId }, update: {}, create: { id: tenantBId, name: 'Beta' } });

    const ownerA = await prisma.user.upsert({ where: { clerkId: 'ownerA' }, update: {}, create: { tenantId: tenantAId, clerkId: 'ownerA', email: 'owner@alpha' } });
    
    // Entities in Tenant B
    const custB = await prisma.customer.upsert({ where: { tenantId_normalizedName: { tenantId: tenantBId, normalizedName: 'cust-b' } }, update: {}, create: { tenantId: tenantBId, name: 'CB', normalizedName: 'cust-b' } });
    const locB = await prisma.location.create({ data: { tenantId: tenantBId, customerId: custB.id, name: 'Loc B_' + Date.now(), address: 'Addr' } });
    const camB = await prisma.camera.create({ data: { tenantId: tenantBId, locationId: locB.id, name: 'Cam B', ipAddress: '0.0.0.0', protocol: 'RTSP' } });
    const aiEvtB = await prisma.aIEvent.create({ data: { tenantId: tenantBId, cameraId: camB.id, model: 'M', confidence: 0.9, detectedObject: 'O' } });
    const userB = await prisma.user.upsert({ where: { clerkId: 'uB' }, update: {}, create: { tenantId: tenantBId, clerkId: 'uB', email: 'ub@test.com' } });
    const convB = await prisma.conversation.create({ data: { tenantId: tenantBId, type: 'WHATSAPP', customerId: custB.id } });
    const taskA = await prisma.task.create({ data: { tenantId: tenantAId, title: 'Task A' } });

    // SET CONTEXT TO TENANT A
    process.env.TEST_TENANT_ID = tenantAId;
    process.env.TEST_USER_ID = ownerA.id;

    async function attempt(name: string, p: Promise<any>) {
      try {
        await p;
        report.results[name] = 'VULNERABLE'; // Created successfully!
      } catch (e: any) {
        report.results[name] = 'VERIFIED BLOCKED';
      }
    }

    // 1. Alpha creates Incident with Beta Location
    await attempt('Incident -> LocationB', createIncident({ locationId: locB.id, cameraId: camB.id, aiEventId: aiEvtB.id, title: 'Inc', severity: 'HIGH' }));

    // 2. Alpha creates Camera with Beta Location
    await attempt('Camera -> LocationB', createCamera({ locationId: locB.id, name: 'Cam', ipAddress: '1', protocol: 'RTSP' }));

    // 3. Alpha sends Message using Beta Conversation
    await attempt('Message -> ConversationB', sendMessage({ conversationId: convB.id, content: 'Msg' }));

    // 4. Alpha creates Notification for Beta User
    await attempt('Notification -> UserB', createNotification({ userId: userB.id, type: 'ALERT', title: 'T', body: 'B' }));

    // 5. Alpha assigns Beta User to Task
    await attempt('Task -> UserB', assignTask(taskA.id, userB.id));

    console.log(JSON.stringify(report, null, 2));

  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
