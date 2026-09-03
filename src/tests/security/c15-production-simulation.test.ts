import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import globalPrisma from '@db/utils/prisma';
import { TwilioProvider } from '@/infrastructure/providers/communication/TwilioProvider';
import { S3StorageProvider } from '@/infrastructure/providers/storage/S3StorageProvider';
import { GeminiProvider } from '@/lib/providers/ai/gemini.provider';

describe('C15 Production Deployment Simulation', () => {

  describe('C15.1 Credential Degradation', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeAll(() => {
      originalEnv = { ...process.env };
      // Delete all credentials
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.GEMINI_API_KEY;
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    test('Providers boot without throwing fatal errors and report degraded health', async () => {
      const twilio = new TwilioProvider();
      const twilioHealth = await twilio.checkHealth();
      expect(twilioHealth.status).toBe('MISSING_CREDENTIALS');
      expect(twilioHealth.criticality).toBe('DEGRADED');

      const s3 = new S3StorageProvider();
      const s3Health = await s3.checkHealth();
      expect(s3Health.status).toBe('MISSING_CREDENTIALS');
      expect(s3Health.criticality).toBe('CRITICAL');

      const gemini = new GeminiProvider();
      const geminiHealth = await gemini.checkHealth();
      expect(geminiHealth.status).toBe('MISSING_CREDENTIALS');
      expect(geminiHealth.criticality).toBe('CRITICAL');
    });
  });

  describe('C15.2 Idempotency Simulation', () => {
    test('DB uniquely constrains IdempotencyKey', async () => {
      const tenant = await globalPrisma.tenant.create({ data: { name: 'Idempotency Test Tenant' } });
      
      const key = `webhook_sim_${Date.now()}`;
      
      await globalPrisma.idempotencyKey.create({
        data: {
          tenantId: tenant.id,
          key,
          expiresAt: new Date(Date.now() + 100000)
        }
      });

      // Second attempt should throw Prisma error P2002
      await expect(
        globalPrisma.idempotencyKey.create({
          data: {
            tenantId: tenant.id,
            key,
            expiresAt: new Date(Date.now() + 100000)
          }
        })
      ).rejects.toThrow(/Unique constraint failed/);

      await globalPrisma.tenant.delete({ where: { id: tenant.id } });
    });
  });
});
