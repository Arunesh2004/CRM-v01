import prisma from '../database/utils/prisma';
import { createLeadAction } from '../src/modules/crm/actions/lead.actions';

async function runTests() {
  console.log('--- Running CRM Validation Tests ---');
  
  // 1. Setup Test Data
  const tenant = await prisma.tenant.create({ data: { name: 'CRM Valid Tenant' }});
  const user = await prisma.user.create({ data: { clerkId: 'crm_valid_' + Date.now(), email: `crm_valid_${Date.now()}@test.com`, tenantId: tenant.id }});
  const role = await prisma.role.create({ data: { name: 'TENANT_ADMIN', tenantId: tenant.id }});
  await prisma.userRole.create({ data: { userId: user.id, roleId: role.id }});

  process.env.TEST_CLERK_ID = user.clerkId;
  
  // 2. Test Invalid Payload Rejection
  console.log('Testing invalid payload...');
  const invalidResult = await createLeadAction({ name: '' } as any);
  if (invalidResult.success !== false) throw new Error('Failed to reject empty name');
  console.log('✔ Invalid payload rejected correctly');

  console.log('Testing unknown field rejection...');
  const unknownFieldResult = await createLeadAction({ name: 'Valid Name', company: 'Valid Co', maliciousField: true } as any);
  if (unknownFieldResult.success !== false) throw new Error('Failed to reject unknown field');
  console.log('✔ Unknown fields stripped/rejected successfully');

  console.log('Testing invalid email...');
  const badEmailResult = await createLeadAction({ name: 'Valid Name', company: 'Valid Co', email: 'notanemail' } as any);
  if (badEmailResult.success !== false) throw new Error('Failed to reject bad email');
  console.log('✔ Invalid email format rejected');

  // 3. Test Successful Request
  console.log('Testing successful validated request...');
  const validResult = await createLeadAction({ name: 'Valid Name', company: 'Valid Co' });
  if (!validResult.success || !validResult.data) throw new Error('Failed successful creation');
  console.log('✔ Valid request executed successfully');

  // 4. Test Permission Denial
  console.log('Testing permission denial boundary...');
  await prisma.userRole.deleteMany({ where: { userId: user.id }}); // Strip permissions
  const deniedResult = await createLeadAction({ name: 'Denied Name', company: 'Denied Co' });
  if (deniedResult.success !== false || !deniedResult.error.includes('Forbidden')) throw new Error('Failed permission boundary check');
  console.log('✔ Action layer blocked unauthorized request');

  // Cleanup
  await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id }});
  await prisma.tenant.delete({ where: { id: tenant.id }});
  console.log('--- Tests Completed Successfully ---');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
