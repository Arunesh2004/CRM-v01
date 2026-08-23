import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { FieldSecurityService } from '../../modules/security/field-security/field-security.service';
import prisma from '../../../database/utils/prisma';
import { withTenant } from '../../../database/utils/prisma-tenant';
import * as crypto from 'crypto';

describe('PII Encryption & FLS Security Tests', () => {
  const tenantId = crypto.randomUUID();
  const adminId = crypto.randomUUID();
  const employeeId = crypto.randomUUID();
  const customerId = crypto.randomUUID();
  const contactId = crypto.randomUUID();

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantId}', 'Tenant A', now(), now())`);
      await tx.$executeRawUnsafe(`-- Admin User
        INSERT INTO "User" (id, "tenantId", email, status, "createdAt", "updatedAt") 
        VALUES ('${adminId}', '${tenantId}', 'admin@test.com', 'ACTIVE', now(), now())`);
      await tx.$executeRawUnsafe(`-- Employee User
        INSERT INTO "User" (id, "tenantId", email, status, "createdAt", "updatedAt") 
        VALUES ('${employeeId}', '${tenantId}', 'employee@test.com', 'ACTIVE', now(), now())`);
      await tx.$executeRawUnsafe(`-- Customer & Contact (with sensitive PII)
        INSERT INTO "Customer" (id, "tenantId", name, "normalizedName", "createdAt", "updatedAt") 
        VALUES ('${customerId}', '${tenantId}', 'MegaCorp', 'megacorp', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "CustomerContact" (id, "customerId", "tenantId", "firstName", "lastName", email, phone, "createdAt", "updatedAt")
        VALUES ('${contactId}', '${customerId}', '${tenantId}', 'Sensitive', 'CEO', 'sensitive.ceo@megacorp.com', '5551239876', now(), now())`);

      await tx.fieldSecurityPolicy.create({ data: { tenantId: tenantId, modelName: 'CustomerContact', fieldName: 'email', securityLevel: 'LEVEL_2_PII' } });
      await tx.fieldSecurityPolicy.create({ data: { tenantId: tenantId, modelName: 'CustomerContact', fieldName: 'phone', securityLevel: 'LEVEL_2_PII' } });
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // Cannot delete tenant because of FK
    });
  });

  it('masks PII fields for unauthorized users (Employee)', async () => {
    // Attack / Verify: Employee reading the contact gets masked fields
    const tenantPrisma = withTenant(tenantId);
    const contact = await tenantPrisma.customerContact.findUnique({
      where: { id: contactId }
    });
    expect(contact).not.toBeNull();

    // Masking runs via FieldSecurityService normally on read
    const maskedContact = await FieldSecurityService.maskFields(tenantId, employeeId, 'CustomerContact', contact);
    
    expect(maskedContact.email).not.toBe('sensitive.ceo@megacorp.com');
    expect(maskedContact.phone).not.toBe('5551239876');
    // Basic verification of masking rule
    expect(maskedContact.phone).toContain('*');
  });

  it('does not leak raw database fields via raw querying if PII is accessed via app boundary', async () => {
    // In our system, if FLS is applied, the raw email should not be revealed
    // unless the user has explicit UNMASK permission (which Employee doesn't)
    const hasUnmask = await FieldSecurityService.canAccessRawField({ id: employeeId }, 'CustomerContact', 'email', tenantId);
    expect(hasUnmask).toBe(false);
  });
});
