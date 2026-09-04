import { PrismaClient } from '@prisma/client';
import { assertValidTenantId } from '../../../../database/utils/tenant-id';

// Initialized outside to share connection pool
const prisma = new PrismaClient();

export async function verifyCallIdentity(callSid: string, tenantId: string): Promise<boolean> {
  try {
    // MUST execute as standard user (crm_app_user by default from DATABASE_URL)
    // Validate tenant identity via RLS explicitly
    const result = await prisma.$transaction(async (tx) => {
      // Set RLS context securely
      assertValidTenantId(tenantId);
      await tx.$queryRawUnsafe(`SELECT set_config('app.current_tenant_id', '${tenantId}', true)`);
      
      // Look up CallLog by providerCallId (which maps to Twilio's CallSid)
      const callLog = await tx.callLog.findFirst({
        where: {
          providerCallId: callSid,
          tenantId: tenantId // Redundant check, but adds defense-in-depth
        }
      });
      
      return !!callLog;
    });
    
    return result;
  } catch (err) {
    console.error('Failed to verify call identity in database', err);
    return false;
  }
}

export async function closeDatabaseConnection() {
  await prisma.$disconnect();
}
