import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '../../../database/utils/prisma-tenant';

export async function getSecurityMetrics(startDate?: Date, endDate?: Date) {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  const dateFilter = startDate && endDate ? { createdAt: { gte: startDate, lte: endDate } } : {};

  const [total, open, investigating, resolved, critical] = await Promise.all([
    prisma.incident.count({ where: { tenantId, ...dateFilter } }),
    prisma.incident.count({ where: { tenantId, status: 'OPEN', ...dateFilter } }),
    prisma.incident.count({ where: { tenantId, status: 'INVESTIGATING', ...dateFilter } }),
    prisma.incident.count({ where: { tenantId, status: 'RESOLVED', ...dateFilter } }),
    prisma.incident.count({ where: { tenantId, severity: 'CRITICAL', ...dateFilter } }),
  ]);

  return { total, open, investigating, resolved, critical };
}

export async function getCameraMetrics() {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  const [total, active, offline] = await Promise.all([
    prisma.camera.count({ where: { tenantId } }),
    prisma.camera.count({ where: { tenantId, status: 'ONLINE' } }),
    prisma.camera.count({ where: { tenantId, status: 'OFFLINE' } }),
  ]);

  return { total, active, offline };
}

export async function getCrmMetrics(startDate?: Date, endDate?: Date) {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  const dateFilter = startDate && endDate ? { createdAt: { gte: startDate, lte: endDate } } : {};

  const [leads, customers, tasks] = await Promise.all([
    prisma.lead.count({ where: { tenantId, ...dateFilter } }),
    prisma.customer.count({ where: { tenantId, ...dateFilter } }),
    prisma.task.count({ where: { tenantId, ...dateFilter } })
  ]);

  const conversionRate = (leads + customers) > 0 ? (customers / (leads + customers)) * 100 : 0;

  return { leads, customers, tasks, conversionRate: conversionRate.toFixed(1) };
}

export async function getCommunicationMetrics(startDate?: Date, endDate?: Date) {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  const dateFilter = startDate && endDate ? { createdAt: { gte: startDate, lte: endDate } } : {};

  // Cap at 1000 rows to prevent memory exhaustion on large tenants.
  // getCommunicationSummary is AI-reachable; an unbounded load is a DoS vector.
  const notifications = await prisma.notification.findMany({
    where: { tenantId, ...dateFilter },
    select: { type: true, title: true },
    take: 1000,
    orderBy: { createdAt: 'desc' },
  });

  let total = notifications.length;
  let email = 0;
  let sms = 0;
  let whatsapp = 0;
  let success = 0;

  notifications.forEach(n => {
    if (n.type === 'ALERT' || n.title.toLowerCase().includes('email')) email++;
    if (n.title.toLowerCase().includes('sms')) sms++;
    if (n.title.toLowerCase().includes('whatsapp')) whatsapp++;
    if (n.title.toLowerCase().includes('sent')) success++;
  });

  const successRate = total > 0 ? (success / total) * 100 : 0;

  const calls = await prisma.callLog.count({ where: { tenantId, ...dateFilter } });

  return { total, email, sms, whatsapp, calls, successRate: successRate.toFixed(1) };
}


export async function getLeadConversionMetrics(startDate?: Date, endDate?: Date) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('LEAD', 'READ');
  const prisma = withTenant(tenantId);

  const dateFilter = startDate && endDate ? { createdAt: { gte: startDate, lte: endDate } } : {};

  const byStage = await prisma.lead.groupBy({
    by: ['status'],
    _count: true,
    where: { tenantId, ...dateFilter }
  });

  let total = 0;
  let converted = 0;

  const stageResults = byStage.map(s => {
    total += s._count;
    if (s.status === 'CONVERTED') {
      converted = s._count;
    }
    return { stage: s.status, count: s._count };
  });

  const conversionRate = total > 0 ? (converted / total) * 100 : 0;

  return { total, byStage: stageResults, converted, conversionRate: Number(conversionRate.toFixed(1)) };
}

export async function getOverdueTaskDistribution() {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('TASK', 'READ');
  const prisma = withTenant(tenantId);

  const byEmployee = await prisma.task.groupBy({
    by: ['assignedUserId'],
    _count: true,
    where: {
      tenantId,
      status: { not: 'COMPLETED' },
      dueDate: { lt: new Date() }
    }
  });

  const userIds = byEmployee.map(b => b.assignedUserId).filter(Boolean) as string[];

  // Resolve employee names
  const users = await prisma.user.findMany({
    where: { tenantId, id: { in: userIds } },
    select: { id: true, email: true },
    take: 50
  });

  const userMap = new Map(users.map(u => [u.id, u.email]));

  let totalOverdue = 0;
  const employeeResults = byEmployee
    .filter(b => b.assignedUserId && userMap.has(b.assignedUserId))
    .map(b => {
      totalOverdue += b._count;
      return {
        userId: b.assignedUserId,
        employeeName: userMap.get(b.assignedUserId as string),
        overdueCount: b._count
      };
    })
    .slice(0, 50);

  return { totalOverdue, byEmployee: employeeResults };
}

export async function getMyAggregateMetrics(startDate?: Date, endDate?: Date) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  const dateFilter = startDate && endDate ? { createdAt: { gte: startDate, lte: endDate } } : {};

  const [myOpenLeadsCount, myTasksCount, myOverdueTasksCount] = await Promise.all([
    prisma.lead.count({ where: { tenantId, assignedUserId: user.id, status: { not: 'CONVERTED' }, ...dateFilter } }),
    prisma.task.count({ where: { tenantId, assignedUserId: user.id, ...dateFilter } }),
    prisma.task.count({ where: { tenantId, assignedUserId: user.id, status: { not: 'COMPLETED' }, dueDate: { lt: new Date() }, ...dateFilter } })
  ]);

  return {
    myOpenLeads: myOpenLeadsCount,
    myTasks: myTasksCount,
    myOverdueTasks: myOverdueTasksCount
  };
}
