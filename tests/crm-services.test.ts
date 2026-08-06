import prisma from '../database/utils/prisma';
import { createLead, convertLeadToCustomer, getLeads } from '../src/modules/crm/lead/lead.service';

async function runTests() {
  console.log('--- Running CRM Service Layer Tests ---');
  
  // 1. Setup Test Data
  const tenant = await prisma.tenant.create({ data: { name: 'CRM Test Tenant' }});
  const user = await prisma.user.create({ data: { clerkId: 'crm_tester_' + Date.now(), email: `crm_${Date.now()}@test.com`, tenantId: tenant.id }});
  const role = await prisma.role.create({ data: { name: 'TENANT_ADMIN', tenantId: tenant.id }});
  await prisma.userRole.create({ data: { userId: user.id, roleId: role.id }});

  process.env.TEST_CLERK_ID = user.clerkId;
  
  // 2. Test CRUD & Permissions
  console.log('Testing createLead...');
  const lead = await createLead({
    name: 'John Doe',
    company: 'Acme Corp',
    email: 'john@acme.com'
  });
  
  if (lead.name !== 'John Doe') throw new Error('Lead creation failed');
  console.log('✔ Lead created successfully');

  console.log('Testing getLeads...');
  const leads = await getLeads();
  if (leads.length === 0) throw new Error('Failed to fetch leads');
  console.log('✔ getLeads returned successfully');

  console.log('Testing convertLeadToCustomer...');
  const customer = await convertLeadToCustomer(lead.id);
  if (customer.name !== 'Acme Corp') throw new Error('Conversion failed');
  console.log('✔ Lead converted to Customer');

  // 3. Test Audit Creation
  const audits = await prisma.auditLog.findMany({ where: { tenantId: tenant.id }});
  const auditActions = audits.map(a => a.action);
  if (!auditActions.includes('LEAD_CREATED')) throw new Error('Audit LEAD_CREATED missing');
  if (!auditActions.includes('LEAD_CONVERTED')) throw new Error('Audit LEAD_CONVERTED missing');
  if (!auditActions.includes('CUSTOMER_CREATED')) throw new Error('Audit CUSTOMER_CREATED missing');
  console.log('✔ Audit logs strictly verified');

  // 4. Test Permission Denial
  console.log('Testing permission rejection...');
  // Demote user
  await prisma.userRole.deleteMany({ where: { userId: user.id }});
  try {
    await getLeads();
    throw new Error('Should have thrown Forbidden error');
  } catch (error: any) {
    if (!error.message.includes('Forbidden')) throw error;
    console.log('✔ Permission denial successful');
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
