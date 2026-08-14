import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createCustomer } from '@/modules/crm/customer/customer.service';
import prisma from '@/../database/utils/prisma';

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const action = body.action;
    const token = request.headers.get('authorization');
    
    // Simulate Clerk Auth Header if provided for testing
    if (token) {
      // Very hacky but safe for diagnostic only: Clerk nextjs auth looks at cookies or headers
      // We will rely on Next.js/Clerk middleware parsing the Authorization Bearer token.
    }

    const results: any = {};

    if (action === 'baseline') {
      const p = new PrismaClient({ log: [] });
      
      const t0 = performance.now();
      await p.$queryRawUnsafe('SELECT 1');
      results.coldSelect = performance.now() - t0;
      
      results.warmSelects = [];
      for (let i = 0; i < 3; i++) {
        const t = performance.now();
        await p.$queryRawUnsafe('SELECT 1');
        results.warmSelects.push(performance.now() - t);
      }
      
      await p.$disconnect();
    }
    
    if (action === 'subscription') {
      const tenantId = body.tenantId;
      if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
      
      const p = new PrismaClient({ log: [] });
      
      const t0 = performance.now();
      await p.subscription.findFirst({
        where: { tenantId, status: { in: ['ACTIVE', 'TRIAL'] } }
      });
      results.subOnly = performance.now() - t0;
      
      const t1 = performance.now();
      await p.subscription.findFirst({
        where: { tenantId, status: { in: ['ACTIVE', 'TRIAL'] } },
        select: { plan: { select: { limits: true } } }
      });
      results.subPlan = performance.now() - t1;
      
      await p.$disconnect();
    }
    
    if (action === 'write') {
      const startTotal = performance.now();
      // This will use the auth token passed in headers
      const res = await createCustomer({
        name: body.name || `Vercel Diag ${Date.now()}`,
        industry: 'Technology'
      });
      results.writeTimings = res._debugTimings;
      results.totalExternal = performance.now() - startTotal;
      results.customerId = res.id;
    }
    
    if (action === 'cleanup') {
      const customerIds = body.customerIds || [];
      const tenantId = body.tenantId;
      const t0 = performance.now();
      
      await prisma.$transaction(async (tx) => {
        for (const cid of customerIds) {
          await tx.customer.deleteMany({ where: { id: cid, tenantId } });
          await tx.activityTimeline.deleteMany({ where: { entityId: cid, entityType: 'CUSTOMER' } });
          await tx.auditLog.deleteMany({ where: { resourceId: cid, resource: 'CUSTOMER' } });
        }
      });
      results.cleanupTime = performance.now() - t0;
    }

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
