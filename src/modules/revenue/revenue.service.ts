import prisma from '../../../database/utils/prisma';
import { withTenant } from '../../../database/utils/prisma-tenant';
import { QuoteStatus, Quote, Prisma } from '@prisma/client';
import { checkPermissionFast } from '../../lib/auth';
import { SecurityEventService } from '../security-events/security-event.service';
import { FieldSecurityService } from '../security/field-security/field-security.service';
import crypto from 'crypto';

export class RevenueService {

  /**
   * Quote Lifecycle State Machine
   */
  static isValidTransition(current: QuoteStatus, next: QuoteStatus): boolean {
    const transitions: Record<QuoteStatus, QuoteStatus[]> = {
      DRAFT: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
      PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
      APPROVED: ['SENT', 'REJECTED', 'EXPIRED'],
      SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
      ACCEPTED: [],
      REJECTED: ['DRAFT'],
      EXPIRED: ['DRAFT']
    };
    return transitions[current].includes(next);
  }

  static async getQuotes(tenantId: string, userId: string) {
    await checkPermissionFast(userId, 'REVENUE', 'READ');
    
    const tenantPrisma = withTenant(tenantId);
    const quotes = await tenantPrisma.quote.findMany({
      where: { tenantId },
      include: {
        deal: true,
        customer: true,
        owner: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const maskedQuotes = await Promise.all(
      quotes.map(async (quote) => {
        return FieldSecurityService.maskFields(tenantId, userId, 'Quote', quote);
      })
    );
    return maskedQuotes;
  }

  static async createQuote(
    tenantId: string,
    userId: string,
    dealId: string,
    customerId: string,
    priceBookId: string,
    lineItemsInput: { priceBookEntryId: string, quantity: number, discount: number }[]
  ): Promise<Quote> {
    
    // 1. RBAC Check
    const hasWrite = await checkPermissionFast(userId, 'REVENUE', 'UPDATE');
    if (!hasWrite) {
      await SecurityEventService.logEvent(tenantId, { eventType: 'SUSPICIOUS_ACTIVITY', severity: 'HIGH', source: 'RevenueService', metadata: { action: 'createQuote' } }, 'USER', userId);
      throw new Error('Unauthorized');
    }

    // 2. Fetch Deal, Customer, and PriceBook
    const deal = await prisma.deal.findFirst({ where: { id: dealId, tenantId } });
    if (!deal) throw new Error('Deal not found or cross-tenant access denied');
    if (deal.customerId !== customerId) throw new Error('Customer mismatch for this deal');

    const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId } });
    if (!customer) throw new Error('Customer not found or cross-tenant access denied');

    const priceBook = await prisma.priceBook.findFirst({ where: { id: priceBookId, tenantId, isActive: true } });
    if (!priceBook) throw new Error('Active PriceBook not found or cross-tenant access denied');

    // 3. Resolve Line Items and compute totals (Snapshots price)
    let subtotal = new Prisma.Decimal(0);
    let discountTotal = new Prisma.Decimal(0);
    
    const resolvedItems: {
      tenantId: string,
      priceBookEntryId: string,
      productId: string,
      quantity: number,
      unitPrice: Prisma.Decimal,
      discount: number,
      subtotal: Prisma.Decimal
    }[] = [];
    
    for (const item of lineItemsInput) {
      if (item.quantity <= 0) throw new Error('Invalid quantity');
      if (item.discount < 0) throw new Error('Invalid discount');

      const pbe = await prisma.priceBookEntry.findFirst({ where: { id: item.priceBookEntryId, priceBookId, tenantId, isActive: true } });
      if (!pbe) throw new Error('Active PriceBookEntry not found or cross-tenant access denied');

      const quantityDec = new Prisma.Decimal(item.quantity);
      const itemSubtotal = pbe.unitPrice.mul(quantityDec).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
      
      const discountDec = new Prisma.Decimal(item.discount.toString());
      const discountRate = discountDec.div(100);
      const itemDiscountTotal = itemSubtotal.mul(discountRate).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);

      subtotal = subtotal.add(itemSubtotal);
      discountTotal = discountTotal.add(itemDiscountTotal);

      resolvedItems.push({
        tenantId,
        priceBookEntryId: pbe.id,
        productId: pbe.productId,
        quantity: item.quantity,
        unitPrice: pbe.unitPrice, // Snapshotted commercial price
        discount: item.discount,
        subtotal: itemSubtotal.sub(itemDiscountTotal)
      });
    }

    const grandTotal = subtotal.sub(discountTotal);
    if (grandTotal.isNegative()) throw new Error('Total cannot be negative');

    // 4. Create Quote
    const tenantPrisma = withTenant(tenantId);
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    return tenantPrisma.$transaction(async (tx: any) => {
      const quote = await tx.quote.create({
        data: {
          tenantId,
          dealId,
          customerId,
          ownerId: userId,
          priceBookId,
          status: 'DRAFT',
          subtotal,
          discountTotal,
          grandTotal,
          lineItems: {
            create: resolvedItems
          }
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: userId,
          actorType: 'USER',
          action: 'QUOTE_CREATED',
          resource: 'Quote',
          resourceId: quote.id,
          metadata: { grandTotal }
        }
      });

      await tx.eventOutbox.create({
        data: {
          eventId: crypto.randomUUID(),
          tenantId,
          eventType: 'QUOTE_CREATED',
          payload: { actorId: userId, resource: 'QUOTE', action: 'CREATE', metadata: { quoteId: quote.id } }
        }
      });

      return quote;
    });
  }

  static async submitForApproval(tenantId: string, userId: string, quoteId: string) {
    const hasUpdate = await checkPermissionFast(userId, 'REVENUE', 'UPDATE');

    const tenantPrisma = withTenant(tenantId);
    const quote = await tenantPrisma.quote.findFirst({ where: { id: quoteId, tenantId }, include: { lineItems: true } });
    if (!quote) throw new Error('Quote not found');

    if (!hasUpdate || quote.ownerId !== userId) {
      await SecurityEventService.logEvent(tenantId, { eventType: 'SUSPICIOUS_ACTIVITY', severity: 'HIGH', source: 'RevenueService', metadata: { action: 'submitForApproval' } }, 'USER', userId);
      throw new Error('Unauthorized: Only the quote owner with REVENUE UPDATE permission can submit it.');
    }

    if (quote.status !== 'DRAFT') throw new Error('Can only submit DRAFT quotes');

    // Evaluate Discount Rules
    const rules = await tenantPrisma.discountRule.findMany({ 
      where: { tenantId, priceBookId: quote.priceBookId, isActive: true },
      orderBy: { priority: 'desc' }
    });

     
    let maxRequestedDiscount = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    quote.lineItems.forEach((item: any) => { if (item.discount > maxRequestedDiscount) maxRequestedDiscount = item.discount; });

    let requiresApproval = false;
    for (const rule of rules) {
      if (maxRequestedDiscount > rule.maxDiscount) {
         throw new Error('Discount exceeds maximum allowable discount boundary.');
      }
      if (maxRequestedDiscount > rule.approvalThreshold) {
         requiresApproval = true;
         break;
      }
    }

     
    const nextStatus = requiresApproval ? 'PENDING_APPROVAL' : 'APPROVED';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    return tenantPrisma.$transaction(async (tx: any) => {
      const updated = await tx.quote.update({
        where: { id: quoteId },
        data: { status: nextStatus }
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: userId,
          actorType: 'USER',
          action: 'QUOTE_STATUS_CHANGED',
          resource: 'Quote',
          resourceId: quote.id,
          metadata: { oldStatus: 'DRAFT', newStatus: nextStatus }
        }
      });

      if (requiresApproval) {
        // Trigger workflow execution
        const workflow = await tx.workflow.findFirst({ where: { tenantId, name: 'Discount Approval Workflow' } });
        if (workflow) {
          await tx.workflowExecution.create({
            data: {
              tenantId,
              workflowId: workflow.id,
              status: 'PENDING',
              context: { quoteId: quote.id, requestedBy: userId }
            }
          });
        }
      }

      await tx.eventOutbox.create({
        data: {
          eventId: crypto.randomUUID(),
          tenantId,
          eventType: 'QUOTE_STATUS_CHANGED',
          payload: { actorId: userId, resource: 'QUOTE', action: 'STATUS_CHANGE', metadata: { quoteId: quote.id, newStatus: nextStatus } }
        }
      });

      return updated;
    });
  }

  static async approveQuote(tenantId: string, approverId: string, quoteId: string) {
    const hasApprove = await checkPermissionFast(approverId, 'REVENUE', 'APPROVE');
    if (!hasApprove) {
      await SecurityEventService.logEvent(tenantId, { eventType: 'SUSPICIOUS_ACTIVITY', severity: 'HIGH', source: 'RevenueService', metadata: { action: 'approveQuote' } }, 'USER', approverId);
      throw new Error('Unauthorized');
    }

    const tenantPrisma = withTenant(tenantId);
     
    const quote = await tenantPrisma.quote.findFirst({ where: { id: quoteId, tenantId } });
    if (!quote || quote.status !== 'PENDING_APPROVAL') throw new Error('Invalid quote state for approval');
    if (quote.ownerId === approverId) throw new Error('Self-approval is not allowed');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    return tenantPrisma.$transaction(async (tx: any) => {
      const updated = await tx.quote.update({
        where: { id: quoteId },
        data: { status: 'APPROVED' }
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: approverId,
          actorType: 'USER',
          action: 'QUOTE_APPROVED',
          resource: 'Quote',
          resourceId: quote.id,
          metadata: {}
        }
      });

      await tx.eventOutbox.create({
        data: {
          eventId: crypto.randomUUID(),
          tenantId,
          eventType: 'QUOTE_APPROVED',
          payload: { actorId: approverId, resource: 'QUOTE', action: 'APPROVE', metadata: { quoteId: quote.id } }
        }
      });

      return updated;
    });
  }

  static async sendQuote(tenantId: string, senderId: string, quoteId: string) {
    const hasUpdate = await checkPermissionFast(senderId, 'REVENUE', 'UPDATE');
    
    const tenantPrisma = withTenant(tenantId);
    const quote = await tenantPrisma.quote.findFirst({ where: { id: quoteId, tenantId } });
    if (!quote) throw new Error('Quote not found');

    if (!hasUpdate || quote.ownerId !== senderId) {
      await SecurityEventService.logEvent(tenantId, { eventType: 'SUSPICIOUS_ACTIVITY', severity: 'HIGH', source: 'RevenueService', metadata: { action: 'sendQuote' } }, 'USER', senderId);
      throw new Error('Unauthorized: Only the quote owner with REVENUE UPDATE permission can send it.');
    }

     
    if (!this.isValidTransition(quote.status, 'SENT')) {
      throw new Error('Invalid state transition to SENT');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    return tenantPrisma.$transaction(async (tx: any) => {
      const updated = await tx.quote.update({
        where: { id: quoteId },
        data: { status: 'SENT' }
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: senderId,
          actorType: 'USER',
          action: 'QUOTE_SENT',
          resource: 'Quote',
          resourceId: quote.id,
          metadata: {}
        }
      });

      await tx.eventOutbox.create({
        data: {
          eventId: crypto.randomUUID(),
          tenantId,
          eventType: 'QUOTE_SENT',
          payload: { actorId: senderId, resource: 'QUOTE', action: 'SEND', metadata: { quoteId: quote.id } }
        }
      });

      return updated;
    });
  }

  static async createQuoteRevision(tenantId: string, userId: string, quoteId: string) {
     // Clone quote logic
     const tenantPrisma = withTenant(tenantId);
     const quote = await tenantPrisma.quote.findFirst({ where: { id: quoteId, tenantId }, include: { lineItems: true } });
      
     if (!quote) throw new Error('Not found');
     
     // Immutable historical lock check
     if (quote.status === 'ACCEPTED') throw new Error('Cannot revise accepted quote');

     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
     return tenantPrisma.$transaction(async (tx: any) => {
        const newQuote = await tx.quote.create({
           data: {
             tenantId,
             dealId: quote.dealId,
             customerId: quote.customerId,
             ownerId: quote.ownerId,
             priceBookId: quote.priceBookId,
              
             status: 'DRAFT',
             subtotal: quote.subtotal,
             discountTotal: quote.discountTotal,
             grandTotal: quote.grandTotal,
             previousVersionId: quote.id, // Links to old version
             lineItems: {
               // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
               create: quote.lineItems.map((item: any) => ({
                  tenantId,
                  priceBookEntryId: item.priceBookEntryId,
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  discount: item.discount,
                  subtotal: item.subtotal
               }))
             }
           }
        });

        await tx.auditLog.create({
          data: {
            tenantId,
            actorId: userId,
            actorType: 'USER',
            action: 'QUOTE_REVISION_CREATED',
            resource: 'Quote',
            resourceId: newQuote.id,
            metadata: { previousVersionId: quote.id }
          }
        });

        await tx.eventOutbox.create({
          data: {
            eventId: crypto.randomUUID(),
            tenantId,
            eventType: 'QUOTE_REVISION_CREATED',
            payload: { actorId: userId, resource: 'QUOTE', action: 'REVISE', metadata: { quoteId: newQuote.id, previousVersionId: quote.id } }
          }
        });

        return newQuote;
     });
  }

  static async acceptQuote(tenantId: string, userId: string, quoteId: string) {
     const hasUpdate = await checkPermissionFast(userId, 'REVENUE', 'UPDATE');

     const tenantPrisma = withTenant(tenantId);
     const quote = await tenantPrisma.quote.findFirst({ where: { id: quoteId, tenantId } });
     if (!quote) throw new Error('Quote not found');

     if (!hasUpdate || quote.ownerId !== userId) {
        await SecurityEventService.logEvent(tenantId, { eventType: 'SUSPICIOUS_ACTIVITY', severity: 'HIGH', source: 'RevenueService', metadata: { action: 'acceptQuote' } }, 'USER', userId);
        throw new Error('Unauthorized: Only the quote owner with REVENUE UPDATE permission can accept it.');
     }
      
     
     if (quote.status === 'ACCEPTED') return quote; // Idempotent

     if (!this.isValidTransition(quote.status, 'ACCEPTED')) {
        throw new Error('Invalid state transition to ACCEPTED');
     }

     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
     return tenantPrisma.$transaction(async (tx: any) => {
        const updated = await tx.quote.update({
          where: { id: quote.id },
          data: { status: 'ACCEPTED' }
        });

        // Deal Integration
        await tx.deal.update({
          where: { id: quote.dealId },
          data: { 
            value: quote.grandTotal.toNumber(),
            // Advance pipeline stage dynamically if needed
          }
        });

        await tx.auditLog.create({
          data: {
            tenantId,
            actorId: userId,
            actorType: 'USER',
            action: 'QUOTE_ACCEPTED',
            resource: 'Quote',
            resourceId: quote.id,
            metadata: { dealUpdated: true }
          }
        });

        await tx.eventOutbox.create({
          data: {
            eventId: crypto.randomUUID(),
            tenantId,
            eventType: 'QUOTE_ACCEPTED',
            payload: { actorId: userId, resource: 'QUOTE', action: 'ACCEPT', metadata: { quoteId: quote.id } }
          }
        });

        return updated;
     });
  }
  static async addQuoteLineItem(tenantId: string, userId: string, quoteId: string, priceBookEntryId: string, quantity: number, discount: number) {
    const hasUpdate = await checkPermissionFast(userId, 'REVENUE', 'UPDATE');
    if (!hasUpdate) {
      await SecurityEventService.logEvent(tenantId, { eventType: 'SUSPICIOUS_ACTIVITY', severity: 'HIGH', source: 'RevenueService', metadata: { action: 'addQuoteLineItem' } }, 'USER', userId);
      throw new Error('Unauthorized');
    }

    if (quantity <= 0) throw new Error('Invalid quantity');
    if (discount < 0 || discount > 100) throw new Error('Invalid discount');

    const tenantPrisma = withTenant(tenantId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    return tenantPrisma.$transaction(async (tx: any) => {
      // Lock the Quote
      await tx.$queryRaw`SELECT id FROM "Quote" WHERE id = ${quoteId} AND "tenantId" = ${tenantId} FOR UPDATE`;

      const quote = await tx.quote.findFirst({ where: { id: quoteId, tenantId } });
      if (!quote) throw new Error('Quote not found');
      if (quote.status !== 'DRAFT') throw new Error('Can only modify DRAFT quotes');

      const pbe = await tx.priceBookEntry.findFirst({ where: { id: priceBookEntryId, tenantId, priceBookId: quote.priceBookId, isActive: true } });
      if (!pbe) throw new Error('Active PriceBookEntry not found or cross-tenant access denied');

      const quantityDec = new Prisma.Decimal(quantity);
      const itemSubtotal = pbe.unitPrice.mul(quantityDec).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
      
      const discountDec = new Prisma.Decimal(discount.toString());
      const discountRate = discountDec.div(100);
      const itemDiscountTotal = itemSubtotal.mul(discountRate).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);

      await tx.quoteLineItem.create({
        data: {
          tenantId,
          quoteId: quote.id,
          priceBookEntryId: pbe.id,
          productId: pbe.productId,
          quantity,
          unitPrice: pbe.unitPrice,
          discount,
          subtotal: itemSubtotal.sub(itemDiscountTotal)
        }
      });

      const allItems = await tx.quoteLineItem.findMany({ where: { quoteId: quote.id, tenantId } });
      let quoteSubtotal = new Prisma.Decimal(0);
      let quoteDiscountTotal = new Prisma.Decimal(0);

      for (const item of allItems) {
        const qDec = new Prisma.Decimal(item.quantity);
        const sub = item.unitPrice.mul(qDec).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
        const dDec = new Prisma.Decimal(item.discount.toString());
        const dRate = dDec.div(100);
        const disc = sub.mul(dRate).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
        
        quoteSubtotal = quoteSubtotal.add(sub);
        quoteDiscountTotal = quoteDiscountTotal.add(disc);
      }

      const quoteGrandTotal = quoteSubtotal.sub(quoteDiscountTotal);

      const updatedQuote = await tx.quote.update({
        where: { id: quote.id },
        data: {
          subtotal: quoteSubtotal,
          discountTotal: quoteDiscountTotal,
          grandTotal: quoteGrandTotal
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: userId,
          actorType: 'USER',
          action: 'QUOTE_UPDATED',
          resource: 'Quote',
          resourceId: quote.id,
          metadata: { subtotal: quoteSubtotal, grandTotal: quoteGrandTotal }
        }
      });

      await tx.eventOutbox.create({
        data: {
          eventId: crypto.randomUUID(),
          tenantId,
          eventType: 'QUOTE_UPDATED',
          payload: { actorId: userId, resource: 'QUOTE', action: 'UPDATE', metadata: { quoteId: quote.id } }
        }
      });

      return updatedQuote;
    });
  }
}
