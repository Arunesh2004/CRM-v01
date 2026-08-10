'use server';

import { requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '../../../database/utils/prisma-tenant';
import { IntegrationProvider } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { ProviderConfigCache } from '@/infrastructure/cache/provider.cache';

export async function getTenantIntegrationsAction() {
  try {
    const tenantId = await requireTenant();
    await requirePermission('SYSTEM', 'READ'); // Assuming READ is for viewing settings
    
    const prisma = withTenant(tenantId);
    
    const integrations = await prisma.tenantIntegration.findMany({
      where: { tenantId },
      select: {
        id: true,
        provider: true,
        status: true,
        lastCheckedAt: true,
        lastError: true,
        capabilities: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true
        // INTENTIONALLY EXCLUDING encryptedToken
      }
    });

    return { success: true, data: integrations };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function testIntegrationConnectionAction(providerType: IntegrationProvider) {
  try {
    const tenantId = await requireTenant();
    await requirePermission('SYSTEM', 'UPDATE');
    
    const prisma = withTenant(tenantId);
    
    // In demo, we just simulate success. If a production adapter were used, we'd call ProviderFactory and test it.
    await prisma.tenantIntegration.updateMany({
      where: { tenantId, provider: providerType },
      data: {
        status: 'ACTIVE',
        lastCheckedAt: new Date(),
        lastError: null
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: 'SYSTEM',
        actorType: 'SYSTEM',
        action: 'INTEGRATION_TESTED',
        resource: 'INTEGRATION',
        resourceId: providerType,
        metadata: { status: 'SUCCESS' },
        ipAddress: '127.0.0.1'
      }
    });

    try {
      ProviderConfigCache.invalidate(`tenant:${tenantId}:provider:${providerType}`);
    } catch (err) {
      console.warn('Failed to invalidate provider cache:', err);
    }

    revalidatePath('/settings/integrations');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateIntegrationCredentialsAction(providerType: IntegrationProvider, credentialsStr: string) {
  try {
    const tenantId = await requireTenant();
    await requirePermission('SYSTEM', 'UPDATE');
    
    // We would import encrypt from @/lib/encryption
    const { encrypt } = await import('@/lib/encryption');
    const encryptedToken = encrypt(credentialsStr);
    
    const prisma = withTenant(tenantId);
    
    await prisma.tenantIntegration.upsert({
      where: {
        tenantId_provider: { tenantId, provider: providerType }
      },
      update: {
        encryptedToken,
        status: 'ACTIVE'
      },
      create: {
        tenantId,
        provider: providerType,
        encryptedToken,
        status: 'ACTIVE'
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: 'SYSTEM',
        actorType: 'SYSTEM',
        action: 'INTEGRATION_UPDATED',
        resource: 'INTEGRATION',
        resourceId: providerType,
        metadata: { provider: providerType },
        ipAddress: '127.0.0.1'
      }
    });

    try {
      ProviderConfigCache.invalidate(`tenant:${tenantId}:provider:${providerType}`);
    } catch (err) {
      console.warn('Failed to invalidate provider cache:', err);
    }

    revalidatePath('/settings/integrations');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteIntegrationAction(providerType: IntegrationProvider) {
  try {
    const tenantId = await requireTenant();
    await requirePermission('SYSTEM', 'UPDATE');
    
    const prisma = withTenant(tenantId);
    
    await prisma.tenantIntegration.deleteMany({
      where: { tenantId, provider: providerType }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: 'SYSTEM',
        actorType: 'SYSTEM',
        action: 'INTEGRATION_DELETED',
        resource: 'INTEGRATION',
        resourceId: providerType,
        metadata: { provider: providerType },
        ipAddress: '127.0.0.1'
      }
    });

    try {
      ProviderConfigCache.invalidate(`tenant:${tenantId}:provider:${providerType}`);
    } catch (err) {
      console.warn('Failed to invalidate provider cache:', err);
    }

    revalidatePath('/settings/integrations');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
