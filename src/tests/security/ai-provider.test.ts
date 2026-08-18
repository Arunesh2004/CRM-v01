import prisma, { prismaAdmin } from '../../../database/utils/prisma';
import { ProviderFactory } from '../../../src/modules/ai/providers/provider.factory';
import { encrypt } from '../../../src/lib/encryption';
import { randomUUID } from 'crypto';

async function runAIProviderSecurityTests() {
  console.log("=== Phase 9: AI Provider Security Validation Tests ===");
  
  const tenantId = randomUUID();
  const rawKey = 'sk-test-secret-key-12345';
  const encrypted = encrypt(rawKey);

  try {
    const tenant = await prismaAdmin.tenant.create({
      data: { id: tenantId, name: 'Test Tenant AI' }
    });

    const config = await prismaAdmin.aIProviderConfig.create({
      data: {
        tenantId,
        provider: 'OPENAI',
        model: 'gpt-4',
        encryptedApiKey: encrypted,
      }
    });
    const testConfigId = config.id;

    console.log("\n--- 1. Normal Prisma query hides encryptedApiKey ---");
    const configs = await prisma.aIProviderConfig.findMany({
      where: { tenantId }
    });
    
    if (configs.length !== 1 || (configs[0] as any).encryptedApiKey !== undefined) {
      throw new Error("Failed to hide encryptedApiKey from normal query");
    }
    console.log("✅ Success: Encrypted API key stripped from normal results");

    console.log("\n--- 2. ProviderFactory initializes securely ---");
    const adminConfig = await prismaAdmin.aIProviderConfig.findUnique({
      where: { id: testConfigId }
    });
    
    if (adminConfig?.encryptedApiKey !== encrypted) {
      throw new Error("Admin query did not return encrypted API key");
    }
    
    const provider = ProviderFactory.createProvider(
      adminConfig!.provider, 
      adminConfig!.encryptedApiKey
    );
    
    if (!provider) {
      throw new Error("Provider factory failed");
    }
    console.log("✅ Success: Provider initialized by explicitly decrypting via Factory");

    console.log("\nAll AI Provider Security Tests Passed 🚀");

  } catch (error) {
    console.error("Test suite failed:", error);
  } finally {
    await prismaAdmin.aIProviderConfig.deleteMany({ where: { tenantId } });
    await prismaAdmin.tenant.deleteMany({ where: { id: tenantId } });
  }
}

runAIProviderSecurityTests().catch(console.error);
