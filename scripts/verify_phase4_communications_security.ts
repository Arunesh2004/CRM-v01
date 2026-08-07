import { PrismaClient } from '@prisma/client';
import { createNotification } from '../src/modules/communication/notification/notification.service';
import { sendMessage } from '../src/modules/communication/messaging/messaging.service';
import { 
  createCall, processCallRecording, requestAITranscript, completeAITranscript, requestAISummary, completeAISummary 
} from '../src/modules/communication/telephony/telephony.service';

const prisma = new PrismaClient();

async function runTests() {
  const report: any = {};
  
  try {
    const tenantA = 'demo-tenant-1';
    const tenantB = 'f14e9658-448c-4e0e-839b-7e4064dc2dc6';

    let userA = await prisma.user.findFirst({ where: { tenantId: tenantA } });
    let tenantB_obj = await prisma.tenant.findUnique({ where: { id: tenantB } });
    if (!tenantB_obj) {
      tenantB_obj = await prisma.tenant.create({ data: { id: tenantB, name: 'Beta Corp' } });
    }
    let userB = await prisma.user.findFirst({ where: { tenantId: tenantB } });
    if (!userB) {
      userB = await prisma.user.create({ data: { tenantId: tenantB, email: 'b@beta.com', clerkId: 'clerk_b' } });
    }
    let customerB = await prisma.customer.findFirst({ where: { tenantId: tenantB } });
    if (!customerB) {
      customerB = await prisma.customer.create({ data: { tenantId: tenantB, name: 'Cust B', normalizedName: 'cust b' } });
    }
    
    // We need a customer A to get a contact
    let customerA = await prisma.customer.findFirst({ where: { tenantId: tenantA } });
    let contactA = await prisma.customerContact.findFirst({ where: { tenantId: tenantA, customerId: customerA?.id } });
    if (!contactA && customerA) {
      contactA = await prisma.customerContact.create({
        data: { tenantId: tenantA, customerId: customerA.id, firstName: 'C', lastName: 'A', phone: '1234567890', isPrimary: true }
      });
    }

    if (!userA || !userB || !customerB || !contactA) throw new Error("Missing test entities");

    // Assign Permissions
    let role = await prisma.role.findFirst({ where: { tenantId: tenantA, name: 'Admin' } });
    if (!role) role = await prisma.role.create({ data: { tenantId: tenantA, name: 'Admin' } });
    let perm = await prisma.permission.findFirst({ where: { resource: 'COMMUNICATION', action: 'CREATE' } });
    if (!perm) perm = await prisma.permission.create({ data: { resource: 'COMMUNICATION', action: 'CREATE' } });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
      update: {},
      create: { roleId: role.id, permissionId: perm.id }
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: userA.id, roleId: role.id } },
      update: {},
      create: { userId: userA.id, roleId: role.id }
    });

    // 1. Notification Security (Cross Tenant)
    process.env.TEST_CLERK_ID = userA.clerkId;
    try {
      await createNotification({ userId: userB.id, type: 'ALERT', title: 'Hacked', body: 'Tenant B' });
      report.section1_NotificationSecurity = "FAIL";
    } catch (e: any) {
      report.section1_NotificationSecurity = e.message.includes("Related entity does not belong to this tenant") ? "PASS" : `FAIL (${e.message})`;
    }

    // 2. Conversation Ownership UUID Swapping
    let convB = await prisma.conversation.findFirst({ where: { tenantId: tenantB } });
    if (!convB) {
      convB = await prisma.conversation.create({ data: { tenantId: tenantB, type: 'WHATSAPP', customerId: customerB.id } });
    }
    try {
      await sendMessage({ conversationId: convB.id, content: 'Hacked' });
      report.section2_ConversationSecurity = "FAIL";
    } catch (e: any) {
      report.section2_ConversationSecurity = e.message.includes("Related entity does not belong to this tenant") ? "PASS" : `FAIL (${e.message})`;
    }

    // 3. SMS Provider Failure Test
    let convA = await prisma.conversation.findFirst({ where: { tenantId: tenantA } });
    if (!convA) {
      convA = await prisma.conversation.create({ data: { tenantId: tenantA, type: 'WHATSAPP', customerId: contactA.customerId } });
    }
    
    // Make contactA have 'fail' phone number to simulate provider rejection
    await prisma.customerContact.update({ where: { id: contactA.id }, data: { phone: 'fail' } });
    const failedMsg = await sendMessage({ conversationId: convA.id, content: 'Test fail' });
    report.section3_SMSProviderFailure = failedMsg.status === 'FAILED' ? "PASS" : "FAIL (status was " + failedMsg.status + ")";

    // 4. SMS Provider Success Test
    await prisma.customerContact.update({ where: { id: contactA.id }, data: { phone: '1234567890' } });
    const successMsg = await sendMessage({ conversationId: convA.id, content: 'Test success' });
    report.section4_SMSProviderSuccess = successMsg.status === 'SENT' ? "PASS" : "FAIL (status was " + successMsg.status + ")";

    // 5. Telephony Architecture (Cross tenant check on recordings)
    const callB = await prisma.call.create({
      data: { tenantId: tenantB, direction: 'OUTBOUND', status: 'IN_PROGRESS' }
    });
    
    try {
      await processCallRecording(callB.id, 's3://tenantb/rec', 60);
      report.section5_RecordingSecurity = "FAIL";
    } catch (e: any) {
      report.section5_RecordingSecurity = e.message.includes("Related entity does not belong to this tenant") ? "PASS" : `FAIL (${e.message})`;
    }

    try {
      await requestAITranscript(callB.id);
      report.section6_TranscriptSecurity = "FAIL";
    } catch (e: any) {
      report.section6_TranscriptSecurity = e.message.includes("Related entity does not belong to this tenant") ? "PASS" : `FAIL (${e.message})`;
    }

    try {
      await requestAISummary(callB.id);
      report.section7_SummarySecurity = "FAIL";
    } catch (e: any) {
      report.section7_SummarySecurity = e.message.includes("Related entity does not belong to this tenant") ? "PASS" : `FAIL (${e.message})`;
    }

    console.log(JSON.stringify(report, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
