import { expect, describe, it, beforeAll, afterAll } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { RevenueService } from '@/modules/revenue/revenue.service';
import { RoleService } from '@/modules/security/role/role.service';

const prisma = new PrismaClient();

describe('Quote Line Item Addition', () => {
  let tenantId: string;
  let ownerId: string;
  let otherUserId: string;
  let customerId: string;
  let dealId: string;
  let priceBookId: string;
  let otherPriceBookId: string;
  let pbeId: string;
  let otherPbeId: string;
  let quoteId: string;

  beforeAll(async () => {
    tenantId = randomUUID();
    ownerId = randomUUID();
    otherUserId = randomUUID();

    // 1. Setup Tenant & Users
    await prisma.tenant.create({ data: { id: tenantId, name: 'Test Tenant', stripeCustomerId: 'test' } });
    await prisma.user.createMany({
      data: [
        { id: ownerId, email: 'owner@test.com', name: 'Owner', identityProviderId: 'test1' },
        { id: otherUserId, email: 'other@test.com', name: 'Other', identityProviderId: 'test2' }
      ]
    });

    // Add REVENUE_MANAGER role to both users
    const rmRole = await prisma.role.findFirst({ where: { name: 'REVENUE_MANAGER' } });
    if (rmRole) {
      await prisma.userRole.createMany({
        data: [
          { userId: ownerId, roleId: rmRole.id, tenantId },
          { userId: otherUserId, roleId: rmRole.id, tenantId }
        ]
      });
    }

    // 2. Setup Customer & Deal
    customerId = randomUUID();
    await prisma.customer.create({ data: { id: customerId, tenantId, name: 'Test Customer', status: 'ACTIVE' } });
    
    dealId = randomUUID();
    await prisma.deal.create({ data: { id: dealId, tenantId, customerId, title: 'Test Deal', stage: 'PROSPECTING', value: 0 } });

    // 3. Setup PriceBooks
    priceBookId = randomUUID();
    otherPriceBookId = randomUUID();
    await prisma.priceBook.createMany({
      data: [
        { id: priceBookId, tenantId, name: 'Primary PB', isActive: true, currency: 'USD' },
        { id: otherPriceBookId, tenantId, name: 'Secondary PB', isActive: true, currency: 'USD' }
      ]
    });

    // 4. Setup Products
    const productId1 = randomUUID();
    const productId2 = randomUUID();
    await prisma.product.createMany({
      data: [
        { id: productId1, tenantId, name: 'Product 1', sku: 'P1', basePrice: 100, isActive: true },
        { id: productId2, tenantId, name: 'Product 2', sku: 'P2', basePrice: 200, isActive: true }
      ]
    });

    // 5. Setup PriceBookEntries
    pbeId = randomUUID();
    otherPbeId = randomUUID();
    await prisma.priceBookEntry.createMany({
      data: [
        { id: pbeId, tenantId, priceBookId, productId: productId1, unitPrice: 150, isActive: true },
        { id: otherPbeId, tenantId, priceBookId: otherPriceBookId, productId: productId2, unitPrice: 250, isActive: true }
      ]
    });

    // 6. Setup Initial Quote
    const initialQuote = await RevenueService.createQuote(tenantId, ownerId, dealId, customerId, priceBookId, []);
    quoteId = initialQuote.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.quoteLineItem.deleteMany({ where: { tenantId } });
    await prisma.quote.deleteMany({ where: { tenantId } });
    await prisma.priceBookEntry.deleteMany({ where: { tenantId } });
    await prisma.product.deleteMany({ where: { tenantId } });
    await prisma.priceBook.deleteMany({ where: { tenantId } });
    await prisma.deal.deleteMany({ where: { tenantId } });
    await prisma.customer.deleteMany({ where: { tenantId } });
    await prisma.userRole.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherUserId] } } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
  });

  it('adds a valid line item and recalculates totals correctly', async () => {
    const updatedQuote = await RevenueService.addQuoteLineItem(tenantId, ownerId, quoteId, pbeId, 2, 10);
    // Quantity 2, Price 150 -> Subtotal 300
    // Discount 10% -> 30
    // Grand Total -> 270
    expect(updatedQuote.subtotal.toNumber()).toBe(300);
    expect(updatedQuote.discountTotal.toNumber()).toBe(30);
    expect(updatedQuote.grandTotal.toNumber()).toBe(270);
  });

  it('rejects adding PriceBookEntry from wrong PriceBook', async () => {
    await expect(RevenueService.addQuoteLineItem(tenantId, ownerId, quoteId, otherPbeId, 1, 0))
      .rejects.toThrow('Active PriceBookEntry not found or cross-tenant access denied');
  });

  it('rejects adding line item to non-DRAFT quote', async () => {
    // Manually change status to SENT
    await prisma.quote.update({ where: { id: quoteId }, data: { status: 'SENT' } });

    await expect(RevenueService.addQuoteLineItem(tenantId, ownerId, quoteId, pbeId, 1, 0))
      .rejects.toThrow('Can only modify DRAFT quotes');

    // Revert status
    await prisma.quote.update({ where: { id: quoteId }, data: { status: 'DRAFT' } });
  });

  it('rejects negative or zero quantity', async () => {
    await expect(RevenueService.addQuoteLineItem(tenantId, ownerId, quoteId, pbeId, 0, 0))
      .rejects.toThrow('Invalid quantity');
    await expect(RevenueService.addQuoteLineItem(tenantId, ownerId, quoteId, pbeId, -5, 0))
      .rejects.toThrow('Invalid quantity');
  });

  it('rejects negative or excessive discount', async () => {
    await expect(RevenueService.addQuoteLineItem(tenantId, ownerId, quoteId, pbeId, 1, -5))
      .rejects.toThrow('Invalid discount');
    await expect(RevenueService.addQuoteLineItem(tenantId, ownerId, quoteId, pbeId, 1, 101))
      .rejects.toThrow('Invalid discount');
  });

  it('allows authorized non-owner to add line item if REVENUE_UPDATE is present', async () => {
    const updatedQuote = await RevenueService.addQuoteLineItem(tenantId, otherUserId, quoteId, pbeId, 1, 0);
    // Previous grand total: 270. Add 1 item at 150 = 420.
    expect(updatedQuote.subtotal.toNumber()).toBe(450);
    expect(updatedQuote.discountTotal.toNumber()).toBe(30);
    expect(updatedQuote.grandTotal.toNumber()).toBe(420);
  });

  it('ensures client price manipulation is rejected by loading persisted DB PriceBookEntry unitPrice', async () => {
    // The signature only accepts quantity and discount. There is no parameter for unitPrice.
    // So client cannot inject unitPrice.
    // This test just asserts that the final unitPrice in the line item is 150.
    const items = await prisma.quoteLineItem.findMany({ where: { quoteId } });
    for (const item of items) {
      expect(item.unitPrice.toNumber()).toBe(150);
    }
  });
});
