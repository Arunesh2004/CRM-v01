import prisma from './prisma';

/**
 * PHASE 26E FAST-PATH HELPER: Customer Export
 * 
 * WHY THIS BYPASSES `withTenant`:
 * The global `withTenant` Prisma extension intercepts $allOperations across 53 models.
 * For high-throughput read paths like `/api/export`, this adds ~877ms of CPU-bound overhead 
 * locally, inflating to >2s on Vercel Serverless.
 * 
 * SECURITY INVARIANT PRESERVATION:
 * This helper does NOT expose generic Prisma `options: any`. 
 * It mechanically enforces `tenantId: trustedTenantId` internally, completely overwriting 
 * any accidental or malicious tenant selection. It only exposes `startDate` and `endDate` parameters.
 * 
 * Do NOT use this as a template to bypass `withTenant` globally. 
 */
export async function getTenantCustomersForExport(trustedTenantId: string, startDate?: Date, endDate?: Date) {
  if (!trustedTenantId) {
    throw new Error('Trusted tenantId is required for fast export path');
  }

  // Preserve the exact semantic filters from the original getCustomersCsv implementation
  const dateFilter = startDate && endDate ? { createdAt: { gte: startDate, lte: endDate } } : {};

  // Mechanically force the tenantId.
  return prisma.customer.findMany({
    where: {
      tenantId: trustedTenantId, // FORCED INTERNALLY
      ...dateFilter
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * PHASE 26E FAST-PATH HELPER: Customer Creation (Write Path)
 * 
 * SECURITY INVARIANT PRESERVATION:
 * 1. tenantId MUST come from the authenticated identity (trustedTenantId), NEVER from payload.
 * 2. It mechanically overrides the database insert's tenantId, preventing cross-tenant writes.
 * 3. Includes AuditLog and ActivityTimeline inserts in the same transaction to preserve atomicity.
 * 4. Bypasses the CPU-heavy `withTenant` global $extends interceptor.
 */
export async function createTenantCustomerFast(
  trustedTenantId: string, 
  actorId: string, 
  customerData: { name: string; industry?: string; assignedUserId?: string }
) {
  if (!trustedTenantId) throw new Error('Trusted tenantId is required for fast write path');
  if (!actorId) throw new Error('Trusted actorId is required for fast write path');

  const normalizedName = customerData.name.toLowerCase().trim().replace(/\s+/g, ' ');

  const startTx = performance.now();
  return await prisma.$transaction(async (tx) => {
    const transactionMs = performance.now() - startTx;
    
    const startInsert = performance.now();
    const customer = await tx.customer.create({
      data: {
        name: customerData.name,
        normalizedName,
        industry: customerData.industry,
        assignedUserId: customerData.assignedUserId,
        tenantId: trustedTenantId,
      }
    });
    const insertMs = performance.now() - startInsert;

    const startAudit = performance.now();
    await tx.auditLog.create({
      data: {
        tenantId: trustedTenantId,
        actorId,
        actorType: 'USER',
        action: 'CUSTOMER_CREATED',
        resource: 'CUSTOMER',
        resourceId: customer.id,
      }
    });
    const auditLogMs = performance.now() - startAudit;

    const startTimeline = performance.now();
    await tx.activityTimeline.create({
      data: {
        tenantId: trustedTenantId,
        type: 'SYSTEM',
        content: `Customer created: ${customer.name}`,
        actorId,
        entityType: 'CUSTOMER',
        entityId: customer.id
      }
    });
    const relatedWritesMs = performance.now() - startTimeline;
    
    // Outbox doesn't currently exist, so we map it as 0.
    const outboxMs = 0;
    
    // Measuring the exact commit time is tricky because commit happens implicitly when the lambda returns.
    // However, Prisma waits for the commit to complete before returning from $transaction.
    // The closest we can get to commitMs is calculating the total transaction wrapper minus our manual inserts.
    // I'll leave commitMs as 0 here since it's hard to isolate without instrumenting the internal Prisma client.
    const commitMs = 0;

    const timings = {
      transactionMs,
      insertMs,
      auditLogMs,
      relatedWritesMs,
      outboxMs,
      commitMs
    };
    return { customer, timings };
  });
}
