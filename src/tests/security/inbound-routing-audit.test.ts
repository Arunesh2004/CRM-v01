import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import prisma from '@db/utils/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

describe('Phase 12.3: TenantPhoneNumber Schema & Isolation Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  const TWILIO_NUMBER = '+15551234567';
  const TWILIO_NUMBER_2 = '+15550009999';

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      const ta = await tx.tenant.create({ data: { name: 'Tenant A - Telephony', status: 'ACTIVE' } });
      const tb = await tx.tenant.create({ data: { name: 'Tenant B - Telephony', status: 'ACTIVE' } });
      tenantAId = ta.id;
      tenantBId = tb.id;
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      await tx.tenantPhoneNumber.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
    });
    await prisma.$disconnect();
  });

  it('AUDIT: Proves the schema enforces E.164 uniqueness across tenants', async () => {
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      // 1. Tenant A claims the Twilio number
      await tx.tenantPhoneNumber.create({
        data: {
          tenantId: tenantAId,
          phoneNumber: TWILIO_NUMBER
        }
      });

      // 2. Tenant B attempts to claim the EXACT SAME number
      let error: any;
      try {
        await tx.tenantPhoneNumber.create({
          data: {
            tenantId: tenantBId,
            phoneNumber: TWILIO_NUMBER
          }
        });
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe('P2002'); // Unique constraint violation
    });
  });

  it('AUDIT: Proves RLS isolates TenantPhoneNumber cross-tenant access', async () => {
    // 1. Setup Tenant B's phone number securely via System
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      await tx.tenantPhoneNumber.create({
        data: { tenantId: tenantBId, phoneNumber: TWILIO_NUMBER_2 }
      });
    });

    // 2. Tenant A attempts to read Tenant B's number using Raw SQL (RLS enforcement check)
    // The crm_app_user should not be able to bypass RLS to read this.
    const readResult: any[] = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantAId}, true);`;
      return tx.$queryRaw`SELECT * FROM "TenantPhoneNumber" WHERE "phoneNumber" = ${TWILIO_NUMBER_2};`;
    });
    expect(readResult.length).toBe(0); // Cannot see it

    // 3. Tenant A attempts to update Tenant B's number via Raw SQL
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantAId}, true);`;
      await tx.$executeRaw`UPDATE "TenantPhoneNumber" SET status = 'DISABLED' WHERE "phoneNumber" = ${TWILIO_NUMBER_2};`;
    });

    // 4. Verify it was NOT updated
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      const bPhone = await tx.tenantPhoneNumber.findUnique({ where: { phoneNumber: TWILIO_NUMBER_2 } });
      expect(bPhone?.status).toBe('ACTIVE');
    });

    // 5. Tenant A attempts to delete Tenant B's number via Raw SQL
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantAId}, true);`;
      await tx.$executeRaw`DELETE FROM "TenantPhoneNumber" WHERE "phoneNumber" = ${TWILIO_NUMBER_2};`;
    });

    // 6. Verify it was NOT deleted
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      const bPhone = await tx.tenantPhoneNumber.findUnique({ where: { phoneNumber: TWILIO_NUMBER_2 } });
      expect(bPhone).not.toBeNull();
    });

    // 7. Tenant A attempts to INSERT a number for Tenant B via Raw SQL (Cross-tenant mass assignment)
    let insertError: any;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantAId}, true);`;
        await tx.$executeRaw`
          INSERT INTO "TenantPhoneNumber" (id, "tenantId", "phoneNumber", "updatedAt")
          VALUES (gen_random_uuid(), ${tenantBId}, '+15550008888', now());
        `;
      });
    } catch (e) {
      insertError = e;
    }
    expect(insertError).toBeDefined();
    expect(insertError.message).toContain('new row violates row-level security policy');
  });
});
