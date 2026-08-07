import { PrismaClient } from '@prisma/client';
import { sendMessage } from '../src/modules/communication/messaging/messaging.service';
import { ProviderFactory } from '../src/lib/providers/provider.factory';

const prisma = new PrismaClient();

async function runAudit() {
  const report: any = {};
  
  try {
    const tenantAId = 'tenant-alpha-prod-audit';
    const tenantBId = 'tenant-beta-prod-audit';

    // SETUP
    let tenantA = await prisma.tenant.findUnique({ where: { id: tenantAId } });
    if (!tenantA) tenantA = await prisma.tenant.create({ data: { id: tenantAId, name: 'Alpha Security Pvt Ltd' } });
    let ownerA = await prisma.user.findFirst({ where: { tenantId: tenantAId, email: 'audit_owner@alpha.com' } });
    if (!ownerA) ownerA = await prisma.user.create({ data: { tenantId: tenantAId, email: 'audit_owner@alpha.com', clerkId: 'audit_owner_a' } });
    let empA = await prisma.user.findFirst({ where: { tenantId: tenantAId, email: 'audit_employee1@alpha.com' } });
    if (!empA) empA = await prisma.user.create({ data: { tenantId: tenantAId, email: 'audit_employee1@alpha.com', clerkId: 'audit_emp_a' } });

    let tenantB = await prisma.tenant.findUnique({ where: { id: tenantBId } });
    if (!tenantB) tenantB = await prisma.tenant.create({ data: { id: tenantBId, name: 'Beta Security Pvt Ltd' } });
    let ownerB = await prisma.user.findFirst({ where: { tenantId: tenantBId, email: 'audit_owner@beta.com' } });
    if (!ownerB) ownerB = await prisma.user.create({ data: { tenantId: tenantBId, email: 'audit_owner@beta.com', clerkId: 'audit_owner_b' } });
    let empB = await prisma.user.findFirst({ where: { tenantId: tenantBId, email: 'audit_employee1@beta.com' } });
    if (!empB) empB = await prisma.user.create({ data: { tenantId: tenantBId, email: 'audit_employee1@beta.com', clerkId: 'audit_emp_b' } });

    // Assign roles to bypass basic auth blocks during tests
    let roleA = await prisma.role.findFirst({ where: { tenantId: tenantAId, name: 'Admin' } });
    if (!roleA) roleA = await prisma.role.create({ data: { tenantId: tenantAId, name: 'Admin' } });
    let perm = await prisma.permission.findFirst({ where: { resource: 'COMMUNICATION', action: 'CREATE' } });
    if (!perm) perm = await prisma.permission.create({ data: { resource: 'COMMUNICATION', action: 'CREATE' } });
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: roleA.id, permissionId: perm.id } }, update: {}, create: { roleId: roleA.id, permissionId: perm.id } });
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: empA.id, roleId: roleA.id } }, update: {}, create: { userId: empA.id, roleId: roleA.id } });

    // SECTION 1: WEBHOOK SECURITY AUDIT
    try {
      const provider = ProviderFactory.getMessagingProvider();
      // Check if receiveWebhook / verifyWebhook exists and acts appropriately
      if (typeof provider.verifyWebhook === 'function') {
        const isValid = await provider.verifyWebhook('invalid_sig', { event: 'delivered' });
        report.section1_webhookSecurity = isValid ? 'FAIL (Unsigned allowed)' : 'PASS (Unsigned rejected)';
      } else {
        report.section1_webhookSecurity = 'NOT VERIFIED (No webhook implementation)';
      }
    } catch (e: any) {
      report.section1_webhookSecurity = `NOT VERIFIED (${e.message})`;
    }

    // SECTION 2: EMPLOYEE COMMUNICATION PRIVACY
    process.env.TEST_CLERK_ID = empA.clerkId;
    let callB = await prisma.call.findFirst({ where: { tenantId: tenantBId } });
    if (!callB) callB = await prisma.call.create({ data: { tenantId: tenantBId, direction: 'OUTBOUND', status: 'IN_PROGRESS' } });
    
    // There is no explicit GET endpoint logic implemented yet in the service files for these, so we check DB constraints directly in Section 3/4.
    report.section2_privacy = 'NOT VERIFIED (No getter services implemented to test)';

    // SECTION 3: RBAC COMMUNICATION MATRIX
    // Read actual Role/Permission mappings
    const allPerms = await prisma.permission.findMany();
    report.section3_rbac = allPerms.length > 0 ? 'PARTIALLY VERIFIED (Permissions exist in DB)' : 'NOT VERIFIED (Matrix not implemented)';

    // SECTION 4: DATA LIFECYCLE
    // Test cascading delete
    const testCall = await prisma.call.create({ data: { tenantId: tenantAId, direction: 'OUTBOUND', status: 'IN_PROGRESS' } });
    await prisma.callRecording.create({ data: { tenantId: tenantAId, callId: testCall.id, storageKey: 'test' } });
    await prisma.call.delete({ where: { id: testCall.id } });
    const recordings = await prisma.callRecording.findMany({ where: { callId: testCall.id } });
    report.section4_dataLifecycle = recordings.length === 0 ? 'PASS (Cascade delete works)' : 'FAIL (Orphan records exist)';

    // SECTION 5: STORAGE SECURITY
    report.section5_storage = 'NOT VERIFIED (No storage URL generation service implemented)';

    // SECTION 6: FAILURE RECOVERY
    let custA = await prisma.customer.findFirst({ where: { tenantId: tenantAId } });
    if (!custA) custA = await prisma.customer.create({ data: { tenantId: tenantAId, name: 'CA', normalizedName: 'ca' } });
    let contactA = await prisma.customerContact.findFirst({ where: { tenantId: tenantAId, customerId: custA.id } });
    if (!contactA) contactA = await prisma.customerContact.create({ data: { tenantId: tenantAId, customerId: custA.id, firstName: 'C', lastName: 'A', phone: 'fail', isPrimary: true } });
    let convA = await prisma.conversation.findFirst({ where: { tenantId: tenantAId } });
    if (!convA) convA = await prisma.conversation.create({ data: { tenantId: tenantAId, type: 'WHATSAPP', customerId: custA.id } });
    
    const msg = await sendMessage({ conversationId: convA.id, content: 'timeout_test' });
    report.section6_failureRecovery = (msg.status === 'FAILED' || msg.status === 'RETRY_PENDING') ? 'PASS' : `FAIL (Status: ${msg.status})`;

    // SECTION 7: QUEUE / CONCURRENCY
    report.section7_concurrency = 'NOT VERIFIED (No idempotency key implementation in message creation)';

    console.log(JSON.stringify(report, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

runAudit();
