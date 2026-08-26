import { describe, it, expect, vi } from 'vitest';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { createDocument } from '../../modules/crm/document/document.service';
import crypto from 'crypto';

const { userId, tenantId, customerId } = vi.hoisted(() => {
  const crypto = require('crypto');
  return {
    userId: crypto.randomUUID(),
    tenantId: crypto.randomUUID(),
    customerId: crypto.randomUUID()
  };
});

vi.mock('../../lib/auth', () => ({
  requireAuthIdentity: vi.fn().mockResolvedValue({ id: userId, tenantId, role: 'ADMIN' }),
  requireTenantFromIdentity: vi.fn().mockResolvedValue(tenantId),
  requirePermissionFast: vi.fn().mockResolvedValue(true),
  requireTenant: vi.fn().mockResolvedValue(tenantId)
}));

vi.mock('../../infrastructure/provider.factory', () => ({
  ProviderFactory: {
    getForTenant: vi.fn().mockResolvedValue({
      upload: vi.fn().mockResolvedValue('mock-storage-key')
    })
  }
}));

describe('Adversarial File / Document Security (Stage 8)', () => {
  it('ATTACK: Upload dangerous file type (Executable)', async () => {
    // Setup dummy tenant and customer
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantId}', 'Tenant A', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, "tenantId", email, status, "createdAt", "updatedAt") VALUES ('${userId}', '${tenantId}', 'test@example.com', 'ACTIVE', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Customer" (id, "tenantId", name, "normalizedName", "createdAt", "updatedAt") VALUES ('${customerId}', '${tenantId}', 'Customer A', 'customera', now(), now())`);
    });

    try {
      // Adversarial test: Validate that the service rejects executable files.
      await expect(executeAsSystem(SystemOperation.SECURITY_AUDIT, async () => {
        return await createDocument({
          fileName: 'malware.exe',
          mimeType: 'application/x-msdownload',
          sizeBytes: 1024,
          buffer: Buffer.from('MZ...'),
          customerId
        });
      })).rejects.toThrow('Invalid file type');
      
    } finally {
      // Cleanup
      await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        await tx.$executeRawUnsafe(`DELETE FROM "AuditLog" WHERE "tenantId" = '${tenantId}'`);
        await tx.$executeRawUnsafe(`DELETE FROM "Document" WHERE "tenantId" = '${tenantId}'`);
        await tx.$executeRawUnsafe(`DELETE FROM "Customer" WHERE "tenantId" = '${tenantId}'`);
        await tx.$executeRawUnsafe(`DELETE FROM "User" WHERE "tenantId" = '${tenantId}'`);
        await tx.$executeRawUnsafe(`DELETE FROM "Tenant" WHERE id = '${tenantId}'`);
      });
    }
  });

  it('ATTACK: Upload extremely large file (DoS)', async () => {
    // Setup dummy tenant and customer
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantId}', 'Tenant A', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, "tenantId", email, status, "createdAt", "updatedAt") VALUES ('${userId}', '${tenantId}', 'test@example.com', 'ACTIVE', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Customer" (id, "tenantId", name, "normalizedName", "createdAt", "updatedAt") VALUES ('${customerId}', '${tenantId}', 'Customer A', 'customera', now(), now())`);
    });

    try {
      // Adversarial test: Validate that the service rejects extremely large files (DoS).
      await expect(executeAsSystem(SystemOperation.SECURITY_AUDIT, async () => {
        return await createDocument({
          fileName: 'bomb.zip',
          mimeType: 'application/zip',
          sizeBytes: 9999999999, // 10 GB
          buffer: Buffer.from('PK...'),
          customerId
        });
      })).rejects.toThrow('File exceeds maximum allowed size');
      
    } finally {
      await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        await tx.$executeRawUnsafe(`DELETE FROM "AuditLog" WHERE "tenantId" = '${tenantId}'`);
        await tx.$executeRawUnsafe(`DELETE FROM "Document" WHERE "tenantId" = '${tenantId}'`);
        await tx.$executeRawUnsafe(`DELETE FROM "Customer" WHERE "tenantId" = '${tenantId}'`);
        await tx.$executeRawUnsafe(`DELETE FROM "User" WHERE "tenantId" = '${tenantId}'`);
        await tx.$executeRawUnsafe(`DELETE FROM "Tenant" WHERE id = '${tenantId}'`);
      });
    }
  });
});
