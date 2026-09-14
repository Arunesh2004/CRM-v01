const fs = require('fs');
let code = fs.readFileSync('src/modules/revenue/revenue.service.ts', 'utf8');

// 1. Add crypto import
code = code.replace(
  "import { FieldSecurityService } from '../security/field-security/field-security.service';",
  "import { FieldSecurityService } from '../security/field-security/field-security.service';\nimport crypto from 'crypto';"
);

// 2. Add validation for Customer and Pricebook
code = code.replace(
  "    // 2. Fetch PriceBook & Deal\n    const deal = await prisma.deal.findFirst({ where: { id: dealId, tenantId } });\n    if (!deal) throw new Error('Deal not found or cross-tenant access denied');",
  "    // 2. Fetch Deal, Customer, and PriceBook\n    const deal = await prisma.deal.findFirst({ where: { id: dealId, tenantId } });\n    if (!deal) throw new Error('Deal not found or cross-tenant access denied');\n    if (deal.customerId !== customerId) throw new Error('Customer mismatch for this deal');\n\n    const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId } });\n    if (!customer) throw new Error('Customer not found or cross-tenant access denied');\n\n    const priceBook = await prisma.priceBook.findFirst({ where: { id: priceBookId, tenantId, isActive: true } });\n    if (!priceBook) throw new Error('Active PriceBook not found or cross-tenant access denied');"
);

// 3. Add quantity and discount validation
code = code.replace(
  "      const pbe = await prisma.priceBookEntry.findFirst({ where: { id: item.priceBookEntryId, priceBookId, tenantId } });\n      if (!pbe) throw new Error('Invalid PriceBookEntry');",
  "      if (item.quantity <= 0) throw new Error('Invalid quantity');\n      if (item.discount < 0) throw new Error('Invalid discount');\n\n      const pbe = await prisma.priceBookEntry.findFirst({ where: { id: item.priceBookEntryId, priceBookId, tenantId, isActive: true } });\n      if (!pbe) throw new Error('Active PriceBookEntry not found or cross-tenant access denied');"
);

// 4. Add negative total validation
code = code.replace(
  "    const grandTotal = subtotal.sub(discountTotal);\n\n    // 4. Create Quote",
  "    const grandTotal = subtotal.sub(discountTotal);\n    if (grandTotal.isNegative()) throw new Error('Total cannot be negative');\n\n    // 4. Create Quote"
);

// 5. Add EventOutbox to createQuote
code = code.replace(
  "          metadata: { grandTotal }\n        }\n      });\n\n      return quote;",
  "          metadata: { grandTotal }\n        }\n      });\n\n      await tx.eventOutbox.create({\n        data: {\n          eventId: crypto.randomUUID(),\n          tenantId,\n          eventType: 'QUOTE_CREATED',\n          payload: { actorId: userId, resource: 'QUOTE', action: 'CREATE', metadata: { quoteId: quote.id } }\n        }\n      });\n\n      return quote;"
);

// 6. Add EventOutbox to submitForApproval
code = code.replace(
  "              context: { quoteId: quote.id, requestedBy: userId }\n            }\n          });\n        }\n      }\n\n      return updated;",
  "              context: { quoteId: quote.id, requestedBy: userId }\n            }\n          });\n        }\n      }\n\n      await tx.eventOutbox.create({\n        data: {\n          eventId: crypto.randomUUID(),\n          tenantId,\n          eventType: 'QUOTE_STATUS_CHANGED',\n          payload: { actorId: userId, resource: 'QUOTE', action: 'STATUS_CHANGE', metadata: { quoteId: quote.id, newStatus: nextStatus } }\n        }\n      });\n\n      return updated;"
);

// 7. Add EventOutbox to approveQuote
code = code.replace(
  "          metadata: {}\n        }\n      });\n      return updated;\n    });\n  }\n\n  static async sendQuote",
  "          metadata: {}\n        }\n      });\n\n      await tx.eventOutbox.create({\n        data: {\n          eventId: crypto.randomUUID(),\n          tenantId,\n          eventType: 'QUOTE_APPROVED',\n          payload: { actorId: approverId, resource: 'QUOTE', action: 'APPROVE', metadata: { quoteId: quote.id } }\n        }\n      });\n\n      return updated;\n    });\n  }\n\n  static async sendQuote"
);

// 8. Add EventOutbox to sendQuote
code = code.replace(
  "          metadata: {}\n        }\n      });\n      return updated;\n    });\n  }\n\n  static async createQuoteRevision",
  "          metadata: {}\n        }\n      });\n\n      await tx.eventOutbox.create({\n        data: {\n          eventId: crypto.randomUUID(),\n          tenantId,\n          eventType: 'QUOTE_SENT',\n          payload: { actorId: senderId, resource: 'QUOTE', action: 'SEND', metadata: { quoteId: quote.id } }\n        }\n      });\n\n      return updated;\n    });\n  }\n\n  static async createQuoteRevision"
);

// 9. Add EventOutbox to createQuoteRevision
code = code.replace(
  "            metadata: { previousVersionId: quote.id }\n          }\n        });\n\n        return newQuote;",
  "            metadata: { previousVersionId: quote.id }\n          }\n        });\n\n        await tx.eventOutbox.create({\n          data: {\n            eventId: crypto.randomUUID(),\n            tenantId,\n            eventType: 'QUOTE_REVISION_CREATED',\n            payload: { actorId: userId, resource: 'QUOTE', action: 'REVISE', metadata: { quoteId: newQuote.id, previousVersionId: quote.id } }\n          }\n        });\n\n        return newQuote;"
);

// 10. Add EventOutbox to acceptQuote
code = code.replace(
  "            metadata: { dealUpdated: true }\n          }\n        });\n\n        return updated;",
  "            metadata: { dealUpdated: true }\n          }\n        });\n\n        await tx.eventOutbox.create({\n          data: {\n            eventId: crypto.randomUUID(),\n            tenantId,\n            eventType: 'QUOTE_ACCEPTED',\n            payload: { actorId: userId, resource: 'QUOTE', action: 'ACCEPT', metadata: { quoteId: quote.id } }\n          }\n        });\n\n        return updated;"
);

fs.writeFileSync('src/modules/revenue/revenue.service.ts', code);
console.log('revenue.service.ts updated');
