const fs = require('fs');
let content = fs.readFileSync('src/modules/revenue/revenue.service.ts', 'utf8').replace(/\r\n/g, '\n');

function replaceOrThrow(search, replacement, name) {
    if (!content.includes(search)) {
        throw new Error('Could not find search string for ' + name);
    }
    content = content.replace(search, replacement);
}

replaceOrThrow(
    `import { FieldSecurityService } from '../security/field-security/field-security.service';`,
    `import { FieldSecurityService } from '../security/field-security/field-security.service';\nimport crypto from 'crypto';`,
    'import crypto'
);

replaceOrThrow(
    `    // 2. Fetch PriceBook & Deal\n    const deal = await prisma.deal.findFirst({ where: { id: dealId, tenantId } });\n    if (!deal) throw new Error('Deal not found or cross-tenant access denied');`,
    `    // 2. Fetch Deal, Customer, and PriceBook\n    const deal = await prisma.deal.findFirst({ where: { id: dealId, tenantId } });\n    if (!deal) throw new Error('Deal not found or cross-tenant access denied');\n    if (deal.customerId !== customerId) throw new Error('Customer mismatch for this deal');\n\n    const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId } });\n    if (!customer) throw new Error('Customer not found or cross-tenant access denied');\n\n    const priceBook = await prisma.priceBook.findFirst({ where: { id: priceBookId, tenantId, isActive: true } });\n    if (!priceBook) throw new Error('Active PriceBook not found or cross-tenant access denied');`,
    'createQuote validations'
);

replaceOrThrow(
    `      const pbe = await prisma.priceBookEntry.findFirst({ where: { id: item.priceBookEntryId, priceBookId, tenantId } });\n      if (!pbe) throw new Error('Invalid PriceBookEntry');`,
    `      if (item.quantity <= 0) throw new Error('Invalid quantity');\n      if (item.discount < 0) throw new Error('Invalid discount');\n\n      const pbe = await prisma.priceBookEntry.findFirst({ where: { id: item.priceBookEntryId, priceBookId, tenantId, isActive: true } });\n      if (!pbe) throw new Error('Active PriceBookEntry not found or cross-tenant access denied');`,
    'createQuote item validations'
);

replaceOrThrow(
    `    const grandTotal = subtotal.sub(discountTotal);\n\n    // 4. Create Quote`,
    `    const grandTotal = subtotal.sub(discountTotal);\n    if (grandTotal.isNegative()) throw new Error('Total cannot be negative');\n\n    // 4. Create Quote`,
    'createQuote negative total'
);

replaceOrThrow(
    `      await tx.auditLog.create({\n        data: {\n          tenantId,\n          actorId: userId,\n          actorType: 'USER',\n          action: 'QUOTE_CREATED',\n          resource: 'Quote',\n          resourceId: quote.id,\n          metadata: { grandTotal }\n        }\n      });\n\n      return quote;`,
    `      await tx.auditLog.create({\n        data: {\n          tenantId,\n          actorId: userId,\n          actorType: 'USER',\n          action: 'QUOTE_CREATED',\n          resource: 'Quote',\n          resourceId: quote.id,\n          metadata: { grandTotal }\n        }\n      });\n\n      await tx.eventOutbox.create({\n        data: {\n          eventId: crypto.randomUUID(),\n          tenantId,\n          eventType: 'QUOTE_CREATED',\n          payload: { actorId: userId, resource: 'QUOTE', action: 'CREATE', metadata: { quoteId: quote.id } }\n        }\n      });\n\n      return quote;`,
    'createQuote EventOutbox'
);

replaceOrThrow(
    `      if (requiresApproval) {\n        // Trigger workflow execution\n        const workflow = await tx.workflow.findFirst({ where: { tenantId, name: 'Discount Approval Workflow' } });\n        if (workflow) {\n          await tx.workflowExecution.create({\n            data: {\n              workflowId: workflow.id,\n              status: 'PENDING',\n              context: { quoteId: quote.id, requestedBy: userId }\n            }\n          });\n        }\n      }\n\n      return updated;`,
    `      if (requiresApproval) {\n        // Trigger workflow execution\n        const workflow = await tx.workflow.findFirst({ where: { tenantId, name: 'Discount Approval Workflow' } });\n        if (workflow) {\n          await tx.workflowExecution.create({\n            data: {\n              workflowId: workflow.id,\n              status: 'PENDING',\n              context: { quoteId: quote.id, requestedBy: userId }\n            }\n          });\n        }\n      }\n\n      await tx.eventOutbox.create({\n        data: {\n          eventId: crypto.randomUUID(),\n          tenantId,\n          eventType: 'QUOTE_STATUS_CHANGED',\n          payload: { actorId: userId, resource: 'QUOTE', action: 'STATUS_CHANGE', metadata: { quoteId: quote.id, newStatus: nextStatus } }\n        }\n      });\n\n      return updated;`,
    'submitForApproval EventOutbox'
);

replaceOrThrow(
    `    const quote = await tenantPrisma.quote.findFirst({ where: { id: quoteId, tenantId } });\n    if (!quote || quote.status !== 'PENDING_APPROVAL') throw new Error('Invalid quote state for approval');`,
    `    const quote = await tenantPrisma.quote.findFirst({ where: { id: quoteId, tenantId } });\n    if (!quote || quote.status !== 'PENDING_APPROVAL') throw new Error('Invalid quote state for approval');\n    if (quote.ownerId === approverId) throw new Error('Self-approval is not allowed');`,
    'approveQuote self-approval rule'
);

replaceOrThrow(
    `      await tx.auditLog.create({\n        data: {\n          tenantId,\n          actorId: approverId,\n          actorType: 'USER',\n          action: 'QUOTE_APPROVED',\n          resource: 'Quote',\n          resourceId: quote.id,\n          metadata: {}\n        }\n      });\n      return updated;`,
    `      await tx.auditLog.create({\n        data: {\n          tenantId,\n          actorId: approverId,\n          actorType: 'USER',\n          action: 'QUOTE_APPROVED',\n          resource: 'Quote',\n          resourceId: quote.id,\n          metadata: {}\n        }\n      });\n\n      await tx.eventOutbox.create({\n        data: {\n          eventId: crypto.randomUUID(),\n          tenantId,\n          eventType: 'QUOTE_APPROVED',\n          payload: { actorId: approverId, resource: 'QUOTE', action: 'APPROVE', metadata: { quoteId: quote.id } }\n        }\n      });\n\n      return updated;`,
    'approveQuote EventOutbox'
);

replaceOrThrow(
    `      await tx.auditLog.create({\n        data: {\n          tenantId,\n          actorId: senderId,\n          actorType: 'USER',\n          action: 'QUOTE_SENT',\n          resource: 'Quote',\n          resourceId: quote.id,\n          metadata: {}\n        }\n      });\n      return updated;`,
    `      await tx.auditLog.create({\n        data: {\n          tenantId,\n          actorId: senderId,\n          actorType: 'USER',\n          action: 'QUOTE_SENT',\n          resource: 'Quote',\n          resourceId: quote.id,\n          metadata: {}\n        }\n      });\n\n      await tx.eventOutbox.create({\n        data: {\n          eventId: crypto.randomUUID(),\n          tenantId,\n          eventType: 'QUOTE_SENT',\n          payload: { actorId: senderId, resource: 'QUOTE', action: 'SEND', metadata: { quoteId: quote.id } }\n        }\n      });\n\n      return updated;`,
    'sendQuote EventOutbox'
);

replaceOrThrow(
    `        await tx.auditLog.create({\n          data: {\n            tenantId,\n            actorId: userId,\n            actorType: 'USER',\n            action: 'QUOTE_REVISION_CREATED',\n            resource: 'Quote',\n            resourceId: newQuote.id,\n            metadata: { previousVersionId: quote.id }\n          }\n        });\n\n        return newQuote;`,
    `        await tx.auditLog.create({\n          data: {\n            tenantId,\n            actorId: userId,\n            actorType: 'USER',\n            action: 'QUOTE_REVISION_CREATED',\n            resource: 'Quote',\n            resourceId: newQuote.id,\n            metadata: { previousVersionId: quote.id }\n          }\n        });\n\n        await tx.eventOutbox.create({\n          data: {\n            eventId: crypto.randomUUID(),\n            tenantId,\n            eventType: 'QUOTE_REVISION_CREATED',\n            payload: { actorId: userId, resource: 'QUOTE', action: 'REVISE', metadata: { quoteId: newQuote.id, previousVersionId: quote.id } }\n          }\n        });\n\n        return newQuote;`,
    'createQuoteRevision EventOutbox'
);

replaceOrThrow(
    `        await tx.auditLog.create({\n          data: {\n            tenantId,\n            actorId: userId,\n            actorType: 'USER',\n            action: 'QUOTE_ACCEPTED',\n            resource: 'Quote',\n            resourceId: quote.id,\n            metadata: { dealUpdated: true }\n          }\n        });\n\n        return updated;`,
    `        await tx.auditLog.create({\n          data: {\n            tenantId,\n            actorId: userId,\n            actorType: 'USER',\n            action: 'QUOTE_ACCEPTED',\n            resource: 'Quote',\n            resourceId: quote.id,\n            metadata: { dealUpdated: true }\n          }\n        });\n\n        await tx.eventOutbox.create({\n          data: {\n            eventId: crypto.randomUUID(),\n            tenantId,\n            eventType: 'QUOTE_ACCEPTED',\n            payload: { actorId: userId, resource: 'QUOTE', action: 'ACCEPT', metadata: { quoteId: quote.id } }\n          }\n        });\n\n        return updated;`,
    'acceptQuote EventOutbox'
);

fs.writeFileSync('src/modules/revenue/revenue.service.ts', content);
console.log('revenue.service.ts updated successfully');
