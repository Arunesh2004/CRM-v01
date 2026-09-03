import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { withTenant } from '@db/utils/prisma-tenant';
import globalPrisma from '@db/utils/prisma';
import { BillingService } from '@/modules/billing/billing.service';

// Mock auth module
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'user-1' }),
  requireTenant: vi.fn(),
  requirePermission: vi.fn().mockResolvedValue(true),
}));

import { requireTenant, requirePermission } from '@/lib/auth';
import { getInvoicesAction, getUsageAction, upgradeSubscriptionAction } from '@/modules/billing/actions/billing.actions';

describe('Billing Security & Tenant Isolation', () => {
  const tenantAId = 'tenant-a-billing-test';
  const tenantBId = 'tenant-b-billing-test';
  
  beforeAll(async () => {
    // Cleanup any orphaned records from failed test runs
    await globalPrisma.$executeRawUnsafe(`DELETE FROM "Document" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
    await globalPrisma.$executeRawUnsafe(`DELETE FROM "User" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
    await globalPrisma.$executeRawUnsafe(`DELETE FROM "Invoice" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
    await globalPrisma.$executeRawUnsafe(`DELETE FROM "Subscription" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
    await globalPrisma.$executeRawUnsafe(`DELETE FROM "Tenant" WHERE id IN ('${tenantAId}', '${tenantBId}')`);

    // Create tenants
    await globalPrisma.tenant.createMany({
      data: [
        { id: tenantAId, name: 'Tenant A Billing' },
        { id: tenantBId, name: 'Tenant B Billing' },
      ],
      skipDuplicates: true
    });
    
    // Create subscription and invoice for Tenant A
    const tenantAPrisma = withTenant(tenantAId);
    
    const subA = await tenantAPrisma.subscription.create({
      data: {
        id: 'sub-a',
        tenantId: tenantAId,
        planId: 'FREE',
        status: 'ACTIVE'
      }
    });

    await tenantAPrisma.invoice.create({
      data: {
        id: 'inv-a-1',
        tenantId: tenantAId,
        amountDue: 50,
        amountPaid: 50,
        status: 'PAID'
      }
    });
    
    // Create resources for usage isolation
    await tenantAPrisma.user.create({
      data: {
        id: 'user-a-1',
        tenantId: tenantAId,
        email: 'userA1@billing.test'
      }
    });
    
    await tenantAPrisma.document.create({
      data: {
        id: 'doc-a-1',
        tenantId: tenantAId,
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024 * 1024, // 1 MB
        storageKey: 'test/key',
        uploadedById: 'user-a-1'
      }
    });
  });
  
  afterAll(async () => {
    const tenantAPrisma = withTenant(tenantAId);
    const tenantBPrisma = withTenant(tenantBId);
    
    await tenantAPrisma.document.deleteMany({ where: { tenantId: tenantAId } });
    await tenantAPrisma.user.deleteMany({ where: { tenantId: tenantAId } });
    await tenantAPrisma.invoice.deleteMany({ where: { tenantId: tenantAId } });
    await tenantAPrisma.subscription.deleteMany({ where: { tenantId: tenantAId } });
    
    // We can't delete Tenant with withTenant since tenant deletion might be restricted or we just use globalPrisma for tenant deletion
    // Wait, let's use raw to force delete if RLS is an issue
    await globalPrisma.$executeRawUnsafe(`DELETE FROM "Document" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
    await globalPrisma.$executeRawUnsafe(`DELETE FROM "User" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
    await globalPrisma.$executeRawUnsafe(`DELETE FROM "Invoice" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
    await globalPrisma.$executeRawUnsafe(`DELETE FROM "Subscription" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
    await globalPrisma.$executeRawUnsafe(`DELETE FROM "Tenant" WHERE id IN ('${tenantAId}', '${tenantBId}')`);
  });
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Invoice IDOR Isolation', () => {
    it('prevents Tenant B from accessing Tenant A invoice by ID', async () => {
      // Simulate Tenant B authenticated
      vi.mocked(requireTenant).mockResolvedValue(tenantBId);
      vi.mocked(requirePermission).mockResolvedValue(true);
      
      const invoice = await BillingService.getInvoiceById(tenantBId, 'inv-a-1');
      expect(invoice).toBeNull();
    });
    
    it('allows Tenant A to access its own invoice', async () => {
      // Simulate Tenant A authenticated
      vi.mocked(requireTenant).mockResolvedValue(tenantAId);
      vi.mocked(requirePermission).mockResolvedValue(true);
      
      const invoice = await BillingService.getInvoiceById(tenantAId, 'inv-a-1');
      expect(invoice).not.toBeNull();
      expect(invoice?.id).toBe('inv-a-1');
    });
  });
  
  describe('RBAC Validation', () => {
    it('prevents read access if missing REVENUE:READ permission', async () => {
      vi.mocked(requireTenant).mockResolvedValue(tenantAId);
      vi.mocked(requirePermission).mockRejectedValue(new Error('Permission denied: REVENUE READ'));
      
      const result = await getInvoicesAction();
      expect(result.success).toBe(false);
      expect(String(result.error)).toContain('Permission denied');
    });
    
    it('prevents update access if missing REVENUE:UPDATE permission', async () => {
      vi.mocked(requireTenant).mockResolvedValue(tenantAId);
      vi.mocked(requirePermission).mockRejectedValue(new Error('Permission denied: REVENUE UPDATE'));
      
      const result = await upgradeSubscriptionAction('PRO');
      expect(result.success).toBe(false);
      expect(String(result.error)).toContain('Permission denied');
    });
  });
  
  describe('Usage Isolation', () => {
    it('calculates usage strictly scoped to the tenant', async () => {
      const usage = await BillingService.getTenantUsage(tenantAId);
      expect(usage.users).toBe(1);
      expect(usage.storageBytes).toBe(1024 * 1024);
      expect(usage.cameras).toBe(0);
      
      const usageB = await BillingService.getTenantUsage(tenantBId);
      expect(usageB.users).toBe(0);
      expect(usageB.storageBytes).toBe(0);
    });
  });
  
  describe('Invalid Plan Injection', () => {
    it('rejects invalid plan identifiers', async () => {
      vi.mocked(requireTenant).mockResolvedValue(tenantAId);
      vi.mocked(requirePermission).mockResolvedValue(true);
      
      const result = await upgradeSubscriptionAction('HACKER_PLAN');
      expect(result.success).toBe(false);
      expect(String(result.error)).toContain('Invalid plan: HACKER_PLAN');
    });
  });
});
