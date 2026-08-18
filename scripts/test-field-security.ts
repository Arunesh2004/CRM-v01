import globalPrisma from '../database/utils/prisma';
import { withEncryptionContext } from '../src/lib/encryption/prisma-extension';
import { EncryptionService } from '../src/lib/encryption/index';
import * as crypto from 'crypto';

async function runTests() {
  console.log('--- Starting Field Level Security & Encryption Tests ---\n');

  const tenantA = 'tenant-A-' + crypto.randomUUID();

  // Setup Tenant
  await globalPrisma.tenant.create({
    data: { id: tenantA, name: 'Tenant A' }
  });

  const adminEmail = 'admin@security.com';
  const employeeEmail = 'employee@security.com';

  const adminUserObj = { id: crypto.randomUUID(), email: adminEmail, tenantId: tenantA };
  const employeeUserObj = { id: crypto.randomUUID(), email: employeeEmail, tenantId: tenantA };

  // Generate Customer data
  const customerId = crypto.randomUUID();
  const contactId = crypto.randomUUID();
  const rawEmail = 'sensitive.ceo@megacorp.com';
  const rawPhone = '5551239876';

  const adminPrisma = globalPrisma.$extends(withEncryptionContext(adminUserObj));
  
  // Need a customer first
  await adminPrisma.customer.create({
    data: {
      id: customerId,
      tenantId: tenantA,
      name: 'MegaCorp',
      normalizedName: 'megacorp'
    }
  });

  await adminPrisma.customerContact.create({
    data: {
      id: contactId,
      tenantId: tenantA,
      customerId: customerId,
      firstName: 'MegaCorp',
      lastName: 'CEO',
      email: rawEmail,
      phone: rawPhone
    }
  });

  try {
    // TEST 1: Normal employee reads contact
    console.log('TEST 1: Employee reads contact (Expect: Masked PII)');
    const employeePrisma = globalPrisma.$extends(withEncryptionContext(employeeUserObj));
    const empView = await employeePrisma.customerContact.findUnique({ where: { id: contactId } });
    
    if (empView?.email === rawEmail || empView?.phone === rawPhone) {
      throw new Error('Test 1 Failed: Employee saw raw PII!');
    }
    if (!empView?.email?.includes('***') || !empView?.phone?.includes('***')) {
      throw new Error('Test 1 Failed: Fields were not properly masked.');
    }
    console.log(`✅ Success: Employee saw masked data: Email(${empView.email}), Phone(${empView.phone})`);

    // TEST 2: Admin reads contact
    console.log('\nTEST 2: Admin reads contact (Expect: Full PII)');
    const adminView = await adminPrisma.customerContact.findUnique({ where: { id: contactId } });
    
    if (adminView?.email !== rawEmail || adminView?.phone !== rawPhone) {
      throw new Error('Test 2 Failed: Admin did not see raw PII!');
    }
    console.log(`✅ Success: Admin saw raw data: Email(${adminView.email}), Phone(${adminView.phone})`);

    // TEST 3: Database inspection
    console.log('\nTEST 3: Direct database inspection (Expect: Ciphertext only)');
    // We use the raw globalPrisma without the encryption extension to simulate a direct DB query.
    const rawDbView = await globalPrisma.customerContact.findUnique({ where: { id: contactId } });
    
    if (rawDbView?.email === rawEmail || !EncryptionService.isEncrypted(rawDbView?.email || '')) {
      throw new Error('Test 3 Failed: Database contains raw plaintext email!');
    }
    if (rawDbView?.phone === rawPhone || !EncryptionService.isEncrypted(rawDbView?.phone || '')) {
      throw new Error('Test 3 Failed: Database contains raw plaintext phone!');
    }
    console.log(`✅ Success: Database holds ciphertext: ${rawDbView.email?.substring(0, 20)}...`);

    // TEST 4: Unauthorized decrypt attempt
    console.log('\nTEST 4: Unauthenticated user decrypt attempt (Expect: Blocked/Masked)');
    const unauthPrisma = globalPrisma.$extends(withEncryptionContext(null));
    const unauthView = await unauthPrisma.customerContact.findUnique({ where: { id: contactId } });
    
    if (unauthView?.email === rawEmail || !unauthView?.email?.includes('***')) {
      throw new Error('Test 4 Failed: Unauth user bypassed masking!');
    }
    console.log(`✅ Success: Unauth user blocked. Result: ${unauthView.email}`);

  } finally {
    // Cleanup
    await globalPrisma.customerContact.deleteMany({ where: { tenantId: tenantA } });
    await globalPrisma.customer.deleteMany({ where: { tenantId: tenantA } });
    await globalPrisma.tenant.delete({ where: { id: tenantA } });
    await globalPrisma.$disconnect();
    console.log('\n--- All Tests Complete ---');
  }
}

runTests().catch(e => {
  console.error('Fatal Test Error:', e);
  process.exit(1);
});
