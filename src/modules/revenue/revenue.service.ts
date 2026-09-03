import prisma from '../../../database/utils/prisma';
import { withTenant } from '../../../database/utils/prisma-tenant';
import { QuoteStatus, Quote, QuoteLineItem, Resource, Action } from '@prisma/client';
import { checkPermissionFast } from '../../lib/auth';
import { SecurityEventService } from '../security-events/security-event.service';
import { FieldSecurityService } from '../security/field-security/field-security.service';

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

    // 2. Fetch PriceBook & Deal
    const deal = await prisma.deal.findFirst({ where: { id: dealId, tenantId } });
    if (!deal) throw new Error('Deal not found or cross-tenant access denied');

    // 3. Resolve Line Items and compute totals (Snapshots price)
    let subtotal = 0;
    let discountTotal = 0;
    
    const resolvedItems: {
      tenantId: string,
      priceBookEntryId: string,
      productId: string,
      quantity: number,
      unitPrice: number,
      discount: number,
      subtotal: number
    }[] = [];
    
    for (const item of lineItemsInput) {
      const pbe = await prisma.priceBookEntry.findFirst({ where: { id: item.priceBookEntryId, priceBookId, tenantId } });
      if (!pbe) throw new Error('Invalid PriceBookEntry');

      const itemSubtotal = pbe.unitPrice * item.quantity;
      const itemDiscountTotal = itemSubtotal * (item.discount / 100);

      subtotal += itemSubtotal;
      discountTotal += itemDiscountTotal;

      resolvedItems.push({
        tenantId,
        priceBookEntryId: pbe.id,
        productId: pbe.productId,
        quantity: item.quantity,
        unitPrice: pbe.unitPrice, // Snapshotted commercial price
        discount: item.discount,
        subtotal: itemSubtotal - itemDiscountTotal
      });
    }

    const grandTotal = subtotal - discountTotal;

    // 4. Create Quote
    const tenantPrisma = withTenant(tenantId);
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

      return quote;
    });
  }

  static async submitForApproval(tenantId: string, userId: string, quoteId: string) {
    const tenantPrisma = withTenant(tenantId);
    const quote = await tenantPrisma.quote.findFirst({ where: { id: quoteId, tenantId }, include: { lineItems: true } });
    if (!quote) throw new Error('Quote not found');

    if (quote.status !== 'DRAFT') throw new Error('Can only submit DRAFT quotes');

    // Evaluate Discount Rules
    const rules = await tenantPrisma.discountRule.findMany({ 
      where: { tenantId, priceBookId: quote.priceBookId, isActive: true },
      orderBy: { priority: 'desc' }
    });

    let maxRequestedDiscount = 0;
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
              workflowId: workflow.id,
              status: 'PENDING',
              context: { quoteId: quote.id, requestedBy: userId }
            }
          });
        }
      }

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

        return newQuote;
     });
  }

  static async acceptQuote(tenantId: string, userId: string, quoteId: string) {
     const tenantPrisma = withTenant(tenantId);
     const quote = await tenantPrisma.quote.findFirst({ where: { id: quoteId, tenantId } });
     if (!quote) throw new Error('Quote not found');
     
     if (quote.status === 'ACCEPTED') return quote; // Idempotent

     if (!this.isValidTransition(quote.status, 'ACCEPTED')) {
        throw new Error('Invalid state transition to ACCEPTED');
     }

     return tenantPrisma.$transaction(async (tx: any) => {
        const updated = await tx.quote.update({
          where: { id: quote.id },
          data: { status: 'ACCEPTED' }
        });

        // Deal Integration
        await tx.deal.update({
          where: { id: quote.dealId },
          data: { 
            value: quote.grandTotal,
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

        return updated;
     });
  }
}
