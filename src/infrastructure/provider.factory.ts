import { requireTenant } from '@/lib/auth';
import { withTenant } from '../../database/utils/prisma-tenant';
import { ProviderConfigCache } from './cache/provider.cache';
import { IntegrationProvider } from '@prisma/client';
import { decrypt } from '@/lib/encryption';
import { DemoCallProvider } from './calling/providers/demo.call.provider';
import { DemoChatProvider } from './chat/providers/demo.chat.provider';
import { DemoVideoProvider } from './video/providers/demo.video.provider';
import { DemoStorageProvider } from './storage/providers/demo.storage.provider';
import { DemoEmailProvider } from './email/providers/demo.email.provider';

import { TwilioCallProvider } from './calling/providers/production/twilio.call.provider';
import { SupabaseChatProvider } from './chat/providers/production/supabase.chat.provider';
import { TwilioVideoProvider } from './video/providers/production/twilio.video.provider';
import { S3StorageProvider } from './storage/providers/production/s3.storage.provider';
import { ResendEmailProvider } from './email/providers/production/resend.email.provider';

export class ProviderFactory {
  static async getForTenant(providerType: IntegrationProvider) {
    const tenantId = await requireTenant();
    const cacheKey = `tenant:${tenantId}:provider:${providerType}`;
    let credentials = ProviderConfigCache.get(cacheKey);

    if (!credentials) {
      const prisma = withTenant(tenantId);
      const integration = await prisma.tenantIntegration.findUnique({
        where: {
          tenantId_provider: {
            tenantId,
            provider: providerType
          }
        }
      });

      if (integration && integration.status === 'ACTIVE') {
        try {
          credentials = JSON.parse(decrypt(integration.encryptedToken));
          ProviderConfigCache.set(cacheKey, credentials, 3600); // 1 hour TTL
        } catch (e) {
          console.error('Failed to decrypt credentials for tenant', tenantId, 'provider', providerType);
        }
      }
    }

    // Resolve provider based on credentials or fallback to Demo Provider
    switch (providerType) {
      case 'TELEPHONY':
        if (credentials?.provider === 'twilio') {
          return new TwilioCallProvider(credentials);
        }
        return new DemoCallProvider(tenantId);
        
      case 'INTERNAL_CHAT':
        if (credentials?.provider === 'supabase') {
          return new SupabaseChatProvider(credentials);
        }
        return new DemoChatProvider(tenantId);
        
      case 'VIDEO':
        if (credentials?.provider === 'twilio') {
          return new TwilioVideoProvider(credentials);
        }
        return new DemoVideoProvider(tenantId);
        
      case 'STORAGE':
        if (credentials?.provider === 's3') {
          return new S3StorageProvider(credentials);
        }
        return new DemoStorageProvider(tenantId);
        
      case 'EMAIL':
        if (credentials?.provider === 'resend') {
          return new ResendEmailProvider(credentials);
        }
        return new DemoEmailProvider(tenantId);
        
      default:
        throw new Error(`Unsupported provider type: ${providerType}`);
    }
  }
}
