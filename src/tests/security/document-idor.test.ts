import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import prisma from '@db/utils/prisma';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { GET } from '@/app/api/documents/[id]/download/route';
import { deleteDocument, requireDocumentAccess } from '@/modules/crm/document/document.service';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  requireAuthIdentity: vi.fn(),
  requireTenant: vi.fn(),
  requireTenantFromIdentity: vi.fn(),
  requirePermissionFast: vi.fn()
}));

vi.mock('@/infrastructure/provider.factory', () => ({
  ProviderFactory: {
    getForTenant: vi.fn().mockResolvedValue({
      getSignedUrl: vi.fn().mockResolvedValue('/mock-signed-url'),
      delete: vi.fn().mockResolvedValue(true)
    })
  }
}));

import { requireAuthIdentity, requireTenant, requireTenantFromIdentity, requirePermissionFast } from '@/lib/auth';

describe('Document API BOLA / IDOR Vulnerability Remediation', () => {
  let tenantA: string, tenantB: string;
  let victimUserA: string, attackerUserA: string, userB: string;
  let unattachedDocA: string, customerDocA: string, explicitDocA: string, revokedDocA: string;
  let docB: string;
  let customerA: string;

  beforeAll(async () => {
    tenantA = crypto.randomUUID();
    tenantB = crypto.randomUUID();
    victimUserA = crypto.randomUUID();
    attackerUserA = crypto.randomUUID();
    userB = crypto.randomUUID();
    unattachedDocA = crypto.randomUUID();
    customerDocA = crypto.randomUUID();
    explicitDocA = crypto.randomUUID();
    revokedDocA = crypto.randomUUID();
    docB = crypto.randomUUID();
    customerA = crypto.randomUUID();

    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // Create Tenants
      await tx.tenant.createMany({ data: [{ id: tenantA, name: 'Tenant A', status: 'ACTIVE' }, { id: tenantB, name: 'Tenant B', status: 'ACTIVE' }] });
      
      // Create Users
      await tx.user.createMany({
        data: [
          { id: victimUserA, tenantId: tenantA, email: 'victim@a.com', status: 'ACTIVE' },
          { id: attackerUserA, tenantId: tenantA, email: 'attacker@a.com', status: 'ACTIVE' },
          { id: userB, tenantId: tenantB, email: 'user@b.com', status: 'ACTIVE' }
        ]
      });

      // Assign Owners
      await tx.tenant.update({ where: { id: tenantA }, data: { ownerId: victimUserA } });
      await tx.tenant.update({ where: { id: tenantB }, data: { ownerId: userB } });

      // Create a Customer in Tenant A
      await tx.customer.create({
        data: { id: customerA, tenantId: tenantA, name: 'Cust A', normalizedName: 'cust a', status: 'ACTIVE' }
      });

      // Create Documents
      await tx.document.createMany({
        data: [
          // Tenant A docs owned by Victim
          { id: unattachedDocA, tenantId: tenantA, fileName: 'u.pdf', mimeType: 'application/pdf', sizeBytes: 100, storageKey: 'u', uploadedById: victimUserA },
          { id: customerDocA, tenantId: tenantA, fileName: 'c.pdf', mimeType: 'application/pdf', sizeBytes: 100, storageKey: 'c', uploadedById: victimUserA, customerId: customerA },
          { id: explicitDocA, tenantId: tenantA, fileName: 'e.pdf', mimeType: 'application/pdf', sizeBytes: 100, storageKey: 'e', uploadedById: victimUserA },
          { id: revokedDocA, tenantId: tenantA, fileName: 'r.pdf', mimeType: 'application/pdf', sizeBytes: 100, storageKey: 'r', uploadedById: victimUserA },
          
          // Tenant B doc
          { id: docB, tenantId: tenantB, fileName: 'b.pdf', mimeType: 'application/pdf', sizeBytes: 100, storageKey: 'b', uploadedById: userB }
        ]
      });

      // Create Permissions
      await tx.documentPermission.createMany({
        data: [
          { tenantId: tenantA, documentId: explicitDocA, userId: attackerUserA, permission: 'READ' },
          // Revoked permission simulated by no record, but we will test an explicit delete scenario.
        ]
      });
    });
  });



  const setupAttackerContext = () => {
    vi.mocked(requireAuthIdentity).mockResolvedValue({ id: attackerUserA, tenantId: tenantA, role: 'USER' } as any);
    vi.mocked(requireTenant).mockResolvedValue(tenantA);
    vi.mocked(requireTenantFromIdentity).mockResolvedValue(tenantA);
    vi.mocked(requirePermissionFast).mockRejectedValue(new Error('Permission denied'));
  };

  it('1. Attacker → victim unattached document (DENY)', async () => {
    setupAttackerContext();
    const req = new NextRequest(`http://localhost:3000/api/documents/${unattachedDocA}/download`);
    const res = await GET(req, { params: Promise.resolve({ id: unattachedDocA }) });
    expect(res.status).toBe(403);
  });

  it('2. Attacker → victim Customer document (DENY unless authorized)', async () => {
    setupAttackerContext();
    const req = new NextRequest(`http://localhost:3000/api/documents/${customerDocA}/download`);
    const res = await GET(req, { params: Promise.resolve({ id: customerDocA }) });
    expect(res.status).toBe(403);
  });

  it('3. Attacker → victim Customer document (ALLOW when authorized)', async () => {
    setupAttackerContext();
    // Grant CUSTOMER:READ
    vi.mocked(requirePermissionFast).mockImplementation(async (userId, resource, action) => {
      if (resource === 'CUSTOMER' && action === 'READ') return true;
      throw new Error('Permission denied');
    });
    const req = new NextRequest(`http://localhost:3000/api/documents/${customerDocA}/download`);
    const res = await GET(req, { params: Promise.resolve({ id: customerDocA }) });
    expect(res.status).toBe(307);
  });

  it('4. Attacker → document with explicit permission (ALLOW)', async () => {
    setupAttackerContext();
    const req = new NextRequest(`http://localhost:3000/api/documents/${explicitDocA}/download`);
    const res = await GET(req, { params: Promise.resolve({ id: explicitDocA }) });
    expect(res.status).toBe(307);
  });

  it('5. Tenant A → Tenant B document UUID (DENY/404)', async () => {
    setupAttackerContext();
    const req = new NextRequest(`http://localhost:3000/api/documents/${docB}/download`);
    const res = await GET(req, { params: Promise.resolve({ id: docB }) });
    // RLS / withTenant ensures cross-tenant looks like 404
    expect(res.status).toBe(404);
  });

  it('6. Forged documentId (DENY/404)', async () => {
    setupAttackerContext();
    const fakeId = crypto.randomUUID();
    const req = new NextRequest(`http://localhost:3000/api/documents/${fakeId}/download`);
    const res = await GET(req, { params: Promise.resolve({ id: fakeId }) });
    expect(res.status).toBe(404);
  });

  it('7. Malformed ID (Safe 400/404)', async () => {
    setupAttackerContext();
    const req = new NextRequest(`http://localhost:3000/api/documents/invalid-uuid-123/download`);
    // Prisma might throw a syntax error for invalid UUID, which our try/catch handles as 401/500, or we explicitly catch
    const res = await GET(req, { params: Promise.resolve({ id: 'invalid-uuid-123' }) });
    // We expect it to not crash the server and not return 307
    expect(res.status).not.toBe(307);
  });

  it('8. Employee → unauthorized document deletion (DENY)', async () => {
    setupAttackerContext();
    await expect(deleteDocument(unattachedDocA)).rejects.toThrow('Forbidden: Unauthorized document access');
  });

  it('9. Employee → authorized document deletion (ALLOW)', async () => {
    setupAttackerContext();
    // The attacker uploads their own document
    const myDoc = crypto.randomUUID();
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.document.create({
        data: { id: myDoc, tenantId: tenantA, fileName: 'm.pdf', mimeType: 'application/pdf', sizeBytes: 100, storageKey: 'm', uploadedById: attackerUserA }
      });
    });

    // They should be able to delete it
    await expect(deleteDocument(myDoc)).resolves.not.toThrow();
  });

});
