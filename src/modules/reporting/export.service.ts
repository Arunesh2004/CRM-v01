import { requireAuth, requireTenant } from '@/lib/auth';
import { withTenant } from '../../../database/utils/prisma-tenant';

export async function getIncidentsCsv(startDate?: Date, endDate?: Date): Promise<string> {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  const dateFilter = startDate && endDate ? { createdAt: { gte: startDate, lte: endDate } } : {};

  const incidents = await prisma.incident.findMany({
    where: { tenantId, ...dateFilter },
    include: { location: true, camera: true },
    orderBy: { createdAt: 'desc' }
  });

  const header = ['ID,Title,Status,Severity,Location,Camera,CreatedAt\n'];
  const rows = incidents.map(inc => 
    `${inc.id},"${inc.title}",${inc.status},${inc.severity},"${inc.location?.name || ''}","${inc.camera?.name || ''}",${inc.createdAt.toISOString()}`
  );

  return header.concat(rows).join('\n');
}

export async function getCustomersCsv(startDate?: Date, endDate?: Date): Promise<string> {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  const dateFilter = startDate && endDate ? { createdAt: { gte: startDate, lte: endDate } } : {};

  const customers = await prisma.customer.findMany({
    where: { tenantId, ...dateFilter },
    orderBy: { createdAt: 'desc' }
  });

  const header = ['ID,Name,Industry,Status,CreatedAt\n'];
  const rows = customers.map(c => 
    `${c.id},"${c.name}","${c.industry || ''}",${c.status},${c.createdAt.toISOString()}`
  );

  return header.concat(rows).join('\n');
}

export async function getCommunicationsCsv(startDate?: Date, endDate?: Date): Promise<string> {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  const dateFilter = startDate && endDate ? { createdAt: { gte: startDate, lte: endDate } } : {};

  const notifications = await prisma.notification.findMany({
    where: { tenantId, ...dateFilter },
    orderBy: { createdAt: 'desc' }
  });

  const header = ['ID,Type,Title,Body,IsRead,CreatedAt\n'];
  const rows = notifications.map(n => 
    `${n.id},${n.type},"${n.title}","${n.body.replace(/"/g, '""')}",${n.isRead},${n.createdAt.toISOString()}`
  );

  return header.concat(rows).join('\n');
}
