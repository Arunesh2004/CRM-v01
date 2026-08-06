import prisma from '../database/utils/prisma';
import { sendEmail } from '../src/modules/communication/email/email.service';
import { createCall } from '../src/modules/communication/telephony/telephony.service';
import { sendMessage } from '../src/modules/communication/messaging/messaging.service';
import { createNotification } from '../src/modules/communication/notification/notification.service';
import { processWebhook } from '../src/modules/communication/webhook/webhook.service';

async function runTests() {
  console.log('--- Running Communication Service Tests ---');
  
  // Setup Test Data
  const tenant = await prisma.tenant.create({ data: { name: 'Comm Test Tenant' }});
  const user = await prisma.user.create({ data: { clerkId: 'comm_test_' + Date.now(), email: `comm_${Date.now()}@test.com`, tenantId: tenant.id }});
  const role = await prisma.role.create({ data: { name: 'TENANT_ADMIN', tenantId: tenant.id }});
  await prisma.userRole.create({ data: { userId: user.id, roleId: role.id }});

  // Assign user context (bypassing auth middleware for integration tests)
  process.env.TEST_CLERK_ID = user.clerkId;
  
  console.log('Testing email creation flow...');
  const email = await sendEmail({ to: 'test@target.com', subject: 'Integration Test', bodyHtml: '<p>Test</p>' });
  if (!email || email.to !== 'test@target.com') throw new Error('Email flow failed');
  console.log('✔ Email creation flow passed');

  console.log('Testing call creation flow...');
  const call = await createCall({ to: '+1234567890', from: '+0987654321' });
  if (!call || call.status !== 'IN_PROGRESS') throw new Error('Call flow failed');
  console.log('✔ Call creation flow passed');

  console.log('Testing notification creation...');
  const notif = await createNotification({ userId: user.id, type: 'SYSTEM', title: 'Test Alert', body: 'This is a test' });
  if (!notif || notif.title !== 'Test Alert') throw new Error('Notification flow failed');
  console.log('✔ Notification creation passed');

  console.log('Testing permission rejection...');
  await prisma.userRole.deleteMany({ where: { userId: user.id }}); // Strip permissions
  try {
    await sendEmail({ to: 'test@target.com', subject: 'Fail Test', bodyHtml: '<p>Test</p>' });
    throw new Error('Should have failed permission check');
  } catch (err: any) {
    if (!err.message.includes('Forbidden')) throw new Error('Failed permission boundary check unexpectedly');
    console.log('✔ Permission rejection passed');
  }

  // Cleanup
  await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id }});
  await prisma.tenant.delete({ where: { id: tenant.id }});
  console.log('--- Tests Completed Successfully ---');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
