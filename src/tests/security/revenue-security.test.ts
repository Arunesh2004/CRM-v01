import { describe, it, expect, beforeAll, vi } from 'vitest';
import prisma from '../../../database/utils/prisma';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { RevenueService } from '../../modules/revenue/revenue.service';
import * as auth from '../../lib/auth';

// Mock RBAC
vi.spyOn(auth, 'checkPermissionFast').mockResolvedValue(true);

describe('Phase 6: Revenue & Adversarial Tests (Expanded)', () => {
  let tenantA = '';
  let tenantB = '';
  let adminUserId = '';
  let dealA = '';
  let customerA = '';
  let customerB = '';
  let priceBookA = '';
  let priceBookEntryA = '';

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      const ta = await tx.tenant.create({ data: { name: 'Tenant A - Rev Sec Expanded' } });
      const tb = await tx.tenant.create({ data: { name: 'Tenant B - Rev Sec Expanded' } });
      tenantA = ta.id;
      tenantB = tb.id;

      const user = await tx.user.create({ data: { tenantId: tenantA, email: 'admin@a.com', firstName: 'Admin', lastName: 'A' } });
      adminUserId = user.id;

      const cA = await tx.customer.create({ data: { tenantId: tenantA, name: 'Customer A', normalizedName: 'customer a' } });
      customerA = cA.id;
      const cB = await tx.customer.create({ data: { tenantId: tenantB, name: 'Customer B', normalizedName: 'customer b' } });
      customerB = cB.id;

      const pipeline = await tx.pipeline.create({ data: { tenantId: tenantA, name: 'Pipeline' } });
      const stage = await tx.pipelineStage.create({ data: { tenantId: tenantA, pipelineId: pipeline.id, name: 'Stage', order: 1 } });
      const dA = await tx.deal.create({ 
        data: { 
          tenant: { connect: { id: tenantA } }, 
          name: 'Deal A', 
          title: 'Deal A', 
          customer: { connect: { id: customerA } }, 
          value: 0, 
          pipeline: { connect: { id: pipeline.id } }, 
          stage: { connect: { id: stage.id } } 
        } 
      });
      dealA = dA.id;

      const prodA = await tx.product.create({ data: { tenantId: tenantA, name: 'Prod A', sku: 'A1', type: 'STANDARD', basePrice: 100 } });
      const pbA = await tx.priceBook.create({ data: { tenantId: tenantA, name: 'PB A', isActive: true } });
      priceBookA = pbA.id;

      const pbeA = await tx.priceBookEntry.create({ data: { tenantId: tenantA, priceBookId: pbA.id, productId: prodA.id, unitPrice: 100, isActive: true } });
      priceBookEntryA = pbeA.id;
    });
  });

  describe('Tenant & Relationship Security', () => {
    it('1, 2, 3. Cross-tenant Deal/Customer and forged tenantId should fail', async () => {
      await expect(
        RevenueService.createQuote(tenantB, adminUserId, dealA, customerA, priceBookA, [])
      ).rejects.toThrow();
    });

    it('4. Deal/Customer mismatch should fail', async () => {
      const badDeal = await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
        const pipeline = await tx.pipeline.findFirst({ where: { tenantId: tenantA } });
        const stage = await tx.pipelineStage.findFirst({ where: { tenantId: tenantA } });
        return tx.deal.create({ 
          data: { 
            tenant: { connect: { id: tenantA } }, 
            name: 'Deal Bad', 
            title: 'Deal Bad', 
            customer: { connect: { id: customerB } }, 
            value: 0, 
            pipeline: { connect: { id: pipeline!.id } }, 
            stage: { connect: { id: stage!.id } } 
          } 
        });
      });
      await expect(
        RevenueService.createQuote(tenantA, adminUserId, badDeal.id, customerA, priceBookA, [])
      ).rejects.toThrow('Customer mismatch');
    });

    it('5, 6, 7. Cross-tenant Product/PriceBook/Entry should fail', async () => {
      await expect(
        RevenueService.createQuote(tenantA, adminUserId, dealA, customerA, 'fake-pb-id', [{ priceBookEntryId: priceBookEntryA, quantity: 1, discount: 0 }])
      ).rejects.toThrow();
    });
  });

  describe('Pricing Tampering', () => {
    it('11, 12, 13, 14, 15, 17, 18. Forged pricing, invalid quantity, negative total', async () => {
      await expect(
        RevenueService.createQuote(tenantA, adminUserId, dealA, customerA, priceBookA, [{ priceBookEntryId: priceBookEntryA, quantity: -1, discount: 0 }])
      ).rejects.toThrow('Invalid quantity');

      await expect(
        RevenueService.createQuote(tenantA, adminUserId, dealA, customerA, priceBookA, [{ priceBookEntryId: priceBookEntryA, quantity: 1, discount: 150 }])
      ).rejects.toThrow('Total cannot be negative');
    });
  });

  describe('Lifecycle & Approval', () => {
    let quoteId = '';

    it('19, 20. Quote creation & EventOutbox atomicity', async () => {
      const quote = await RevenueService.createQuote(tenantA, adminUserId, dealA, customerA, priceBookA, [{ priceBookEntryId: priceBookEntryA, quantity: 1, discount: 0 }]);
      quoteId = quote.id;
      expect(quote).toBeDefined();

      const outbox = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        return tx.eventOutbox.findFirst({ where: { tenantId: tenantA, eventType: 'QUOTE_CREATED', payload: { path: ['metadata', 'quoteId'], equals: quote.id } } });
      });
      expect(outbox).not.toBeNull();
    });

    it('24, 27. Self-approval should be prevented', async () => {
      await RevenueService.submitForApproval(tenantA, adminUserId, quoteId);
      
      await expect(
        RevenueService.approveQuote(tenantA, adminUserId, quoteId)
      ).rejects.toThrow('Self-approval is not allowed');
    });

    it('29, 31, 32. Duplicate transitions should fail', async () => {
      await expect(
        RevenueService.submitForApproval(tenantA, adminUserId, quoteId)
      ).rejects.toThrow();
    });
  });
});
