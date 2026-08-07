import { PrismaClient } from '@prisma/client';
import { sendMessage, getMessages, getConversations } from '../src/modules/communication/messaging/messaging.service';
import { getCalls, getRecordings } from '../src/modules/communication/telephony/telephony.service';
import { generateRecordingAccessUrl } from '../src/modules/communication/storage/storage.service';
import { WebhookSignatureService } from '../src/modules/communication/webhook/webhook.service';

const prisma = new PrismaClient();

async function runSecuritySuite() {
  const report: any = {};
  
  try {
    const tenantAId = 'tenant-alpha-phase42';
    const tenantBId = 'tenant-beta-phase42';

    // 1. SETUP
    let tenantA = await prisma.tenant.upsert({ where: { id: tenantAId }, update: {}, create: { id: tenantAId, name: 'Company A' } });
    let ownerA = await prisma.user.upsert({ where: { clerkId: 'owner_a_42' }, update: {}, create: { tenantId: tenantAId, email: 'owner_a@alpha.com', clerkId: 'owner_a_42' } });
    let empA = await prisma.user.upsert({ where: { clerkId: 'emp_a_42' }, update: {}, create: { tenantId: tenantAId, email: 'emp_a@alpha.com', clerkId: 'emp_a_42' } });
    let empA_NoPerm = await prisma.user.upsert({ where: { clerkId: 'emp_a_noperm' }, update: {}, create: { tenantId: tenantAId, email: 'emp_a_noperm@alpha.com', clerkId: 'emp_a_noperm' } });

    let tenantB = await prisma.tenant.upsert({ where: { id: tenantBId }, update: {}, create: { id: tenantBId, name: 'Company B' } });
    let ownerB = await prisma.user.upsert({ where: { clerkId: 'owner_b_42' }, update: {}, create: { tenantId: tenantBId, email: 'owner_b@beta.com', clerkId: 'owner_b_42' } });

    // RBAC Permissions
    let roleA = await prisma.role.findFirst({ where: { tenantId: tenantAId, name: 'Employee' } });
    if (!roleA) roleA = await prisma.role.create({ data: { tenantId: tenantAId, name: 'Employee' } });
    
    let viewPerm = await prisma.permission.findFirst({ where: { resource: 'COMMUNICATION', action: 'READ' } });
    if (!viewPerm) viewPerm = await prisma.permission.create({ data: { resource: 'COMMUNICATION', action: 'READ' } });
    let createPerm = await prisma.permission.findFirst({ where: { resource: 'COMMUNICATION', action: 'CREATE' } });
    if (!createPerm) createPerm = await prisma.permission.create({ data: { resource: 'COMMUNICATION', action: 'CREATE' } });
    
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: roleA.id, permissionId: viewPerm.id } }, update: {}, create: { roleId: roleA.id, permissionId: viewPerm.id } });
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: roleA.id, permissionId: createPerm.id } }, update: {}, create: { roleId: roleA.id, permissionId: createPerm.id } });
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: empA.id, roleId: roleA.id } }, update: {}, create: { userId: empA.id, roleId: roleA.id } });
    // empA_NoPerm has NO roles.

    // Entities
    let custA = await prisma.customer.upsert({ where: { tenantId_normalizedName: { tenantId: tenantAId, normalizedName: 'ca42' } }, update: {}, create: { tenantId: tenantAId, name: 'CA42', normalizedName: 'ca42' } });
    await prisma.customerContact.deleteMany({ where: { customerId: custA.id } });
    await prisma.customerContact.create({ data: { tenantId: tenantAId, customerId: custA.id, firstName: 'C', lastName: 'A', phone: '1234567890', isPrimary: true } });
    let convA = await prisma.conversation.create({ data: { tenantId: tenantAId, type: 'WHATSAPP', customerId: custA.id } });
    
    let custB = await prisma.customer.upsert({ where: { tenantId_normalizedName: { tenantId: tenantBId, normalizedName: 'cb42' } }, update: {}, create: { tenantId: tenantBId, name: 'CB42', normalizedName: 'cb42' } });
    await prisma.customerContact.deleteMany({ where: { customerId: custB.id } });
    await prisma.customerContact.create({ data: { tenantId: tenantBId, customerId: custB.id, firstName: 'C', lastName: 'B', phone: '0987654321', isPrimary: true } });
    let convB = await prisma.conversation.create({ data: { tenantId: tenantBId, type: 'WHATSAPP', customerId: custB.id } });
    
    let callA = await prisma.call.create({ data: { tenantId: tenantAId, direction: 'OUTBOUND', status: 'IN_PROGRESS' } });
    let recA = await prisma.callRecording.create({ data: { tenantId: tenantAId, callId: callA.id, storageKey: 's3://a' } });


    // TEST 1, 2, 3: WEBHOOK SECURITY
    // Unsigned webhook
    let passUnsigned = false;
    try { await WebhookSignatureService.processWebhook(tenantAId, 'whatsapp', 'evnt_unsign', 'delivered', { fake: 1 }, 'invalid_sig'); } 
    catch(e: any) { passUnsigned = e.message.includes('Invalid webhook signature'); }
    
    // Replay attack
    let passReplay = false;
    try {
      await WebhookSignatureService.processWebhook(tenantAId, 'whatsapp', 'evnt_replay', 'delivered', { fake: 2 }, 'valid_mock_signature');
      await WebhookSignatureService.processWebhook(tenantAId, 'whatsapp', 'evnt_replay', 'delivered', { fake: 2 }, 'valid_mock_signature');
    } catch(e: any) { passReplay = e.message.includes('replay'); }
    
    report.test_WebhookSecurity = (passUnsigned && passReplay) ? '✅ VERIFIED FIXED' : '❌ FAILED';


    // TEST 4, 5: CROSS TENANT READ
    process.env.TEST_CLERK_ID = empA.clerkId; // Emp A context
    
    let passReadConv = false;
    try { await getMessages(convB.id); } 
    catch(e: any) { passReadConv = e.message.includes('Related entity does not belong to this tenant'); }

    let passReadRec = false;
    try { await generateRecordingAccessUrl(recA.id); } 
    catch(e: any) { passReadRec = e.message.includes('Recording not found or access denied (tenant mismatch)'); } // wait, EmpA requesting recA should work
    let passReadRecCross = false;
    try { 
      process.env.TEST_CLERK_ID = ownerB.clerkId; // switch to B
      // Assign B permission
      let roleB = await prisma.role.findFirst({ where: { tenantId: tenantBId, name: 'Admin' } });
      if (!roleB) roleB = await prisma.role.create({ data: { tenantId: tenantBId, name: 'Admin' } });
      await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: roleB.id, permissionId: viewPerm.id } }, update: {}, create: { roleId: roleB.id, permissionId: viewPerm.id } });
      await prisma.userRole.upsert({ where: { userId_roleId: { userId: ownerB.id, roleId: roleB.id } }, update: {}, create: { userId: ownerB.id, roleId: roleB.id } });
      await generateRecordingAccessUrl(recA.id); 
    } 
    catch(e: any) { passReadRecCross = e.message.includes('Recording not found or access denied (tenant mismatch)'); }

    report.test_ReadIsolation = (passReadConv && passReadRecCross) ? '✅ VERIFIED FIXED' : '❌ FAILED';


    // TEST 6: RBAC
    process.env.TEST_CLERK_ID = empA_NoPerm.clerkId;
    let passRbac = false;
    try { await sendMessage({ conversationId: convA.id, content: 'fail' }); }
    catch(e: any) { passRbac = e.message.includes('Forbidden: Requires'); }
    report.test_RbacEnforcement = passRbac ? '✅ VERIFIED FIXED' : '❌ FAILED';


    // TEST 7: IDEMPOTENCY
    process.env.TEST_CLERK_ID = empA.clerkId;
    const idempotentId = 'idemp-12345';
    await Promise.all([
      sendMessage({ conversationId: convA.id, content: 'idemp', idempotencyKey: idempotentId }),
      sendMessage({ conversationId: convA.id, content: 'idemp', idempotencyKey: idempotentId }),
      sendMessage({ conversationId: convA.id, content: 'idemp', idempotencyKey: idempotentId }),
      sendMessage({ conversationId: convA.id, content: 'idemp', idempotencyKey: idempotentId }),
      sendMessage({ conversationId: convA.id, content: 'idemp', idempotencyKey: idempotentId })
    ]);
    const idempCount = await prisma.message.count({ where: { idempotencyKey: idempotentId } });
    report.test_Idempotency = (idempCount === 1) ? '✅ VERIFIED FIXED' : `❌ FAILED (Count: ${idempCount})`;


    // TEST 8, 9: PROVIDER SUCCESS & FAILURE
    const msgSuccess = await sendMessage({ conversationId: convA.id, content: 'success' });
    const msgFail = await sendMessage({ conversationId: convA.id, content: 'fail', idempotencyKey: 'fail123' }); // mock provider logic drops if phone='fail' or content='fail'
    
    // Wait, mock logic was on phone='fail', not content.
    // Let's create a fail contact.
    const failContact = await prisma.customerContact.create({ data: { tenantId: tenantAId, customerId: custA.id, firstName: 'F', lastName: 'A', phone: 'fail', isPrimary: false } }); // won't be used since we grab primary
    
    // We can simulate provider failure manually or rely on existing mock. The mock WhatsApp provider in messaging.service.ts uses phone == 'fail'.
    await prisma.customerContact.updateMany({ where: { customerId: custA.id }, data: { isPrimary: false } });
    await prisma.customerContact.update({ where: { id: failContact.id }, data: { isPrimary: true } });
    
    const msgRealFail = await sendMessage({ conversationId: convA.id, content: 'failing' });
    
    report.test_ProviderFailureHandling = (msgSuccess.status === 'SENT' && msgRealFail.status === 'FAILED') ? '✅ VERIFIED FIXED' : `❌ FAILED (Success: ${msgSuccess.status}, Fail: ${msgRealFail.status})`;

    console.log(JSON.stringify(report, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

runSecuritySuite();
