import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { requireAuth, requireTenant } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';
import { Logger } from '@/lib/logger/logger';

const _orig_GET = async function (req: NextRequest) {
  try {
    await requireAuth();
    const tenantId = await requireTenant();
    const prisma = withTenant(tenantId);
    
    const url = new URL(req.url);
    const query = url.searchParams.get('q') || '';
    
    if (query.trim().length < 2) {
      return NextResponse.json({ customers: [], leads: [], tasks: [] });
    }

    const [customers, leads, tasks] = await Promise.all([
      prisma.customer.findMany({
        where: {
          tenantId,
          deletedAt: null,
          name: { contains: query, mode: 'insensitive' }
        },
        take: 5,
        select: { id: true, name: true, industry: true }
      }),
      prisma.lead.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { company: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: 5,
        select: { id: true, name: true, email: true, company: true }
      }),
      prisma.task.findMany({
        where: {
          tenantId,
          title: { contains: query, mode: 'insensitive' }
        },
        take: 5,
        select: { id: true, title: true, status: true, priority: true }
      })
    ]);

    return NextResponse.json({
      customers: customers.map(c => ({
        type: 'CUSTOMER',
        id: c.id,
        title: c.name,
        subtitle: c.industry || 'Customer',
        url: `/customers/${c.id}`
      })),
      leads: leads.map(l => ({
        type: 'LEAD',
        id: l.id,
        title: l.name,
        subtitle: l.company || l.email || '',
        url: `/leads/${l.id}`
      })),
      tasks: tasks.map(t => ({
        type: 'TASK',
        id: t.id,
        title: t.title,
        subtitle: `Status: ${t.status} | Priority: ${t.priority}`,
        url: `/tasks/${t.id}`
      }))
    });

  } catch (error: any) {
    Logger.error('[API] GET Search failed', error);
    if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized') || error.message?.includes('Missing tenant')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withApiContext(_orig_GET);
