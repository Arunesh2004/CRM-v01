import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { encrypt, decrypt } from '../../lib/encryption';
import prisma from '../../../database/utils/prisma';
import * as crypto from 'crypto';

describe('AI Provider Config Security Tests', () => {
  const tenantId = crypto.randomUUID();
  const rawApiKey = 'sk-test-secret-key-12345';
  let configId: string;

  beforeAll(async () => {
    process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
    const encryptedKey = encrypt(rawApiKey)!;

    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`
        INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantId}', 'Tenant A', now(), now());
      `);
      
      const config = await tx.aIProviderConfig.create({
        data: {
          tenantId,
          provider: 'OPENAI',
          model: 'gpt-4',
          encryptedApiKey: encryptedKey,
        }
      });
      configId = config.id;
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`DELETE FROM "Tenant" WHERE id = '${tenantId}'`);
    });
  });

  it('stores API keys securely encrypted in the database', async () => {
    // Read raw from DB to ensure it's not plaintext
    const rawRecord: any[] = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      return tx.$queryRawUnsafe(`
        SELECT "encryptedApiKey" FROM "AIProviderConfig" WHERE id = '${configId}'
      `);
    });
    
    const dbValue = rawRecord[0].encryptedApiKey;
    expect(dbValue).not.toBe(rawApiKey);
    expect(dbValue).not.toContain('sk-'); // Changed from 'v1:' since our encrypt format is iv:authTag:encryptedData
    
    // Decrypts correctly
    const decrypted = decrypt(dbValue);
    expect(decrypted).toBe(rawApiKey);
  });
});
