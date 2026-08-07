import { requireAuth, requireTenant } from '@/lib/auth';
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

  const notifications = await prisma.notification.findMany({
    where: { tenantId, ...dateFilter },
    select: { type: true, title: true }
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

  const calls = await prisma.call.count({ where: { tenantId, ...dateFilter } });

  return { total, email, sms, whatsapp, calls, successRate: successRate.toFixed(1) };
}

export async function getBillingMetrics(startDate?: Date, endDate?: Date) {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  const dateFilter = startDate && endDate ? { createdAt: { gte: startDate, lte: endDate } } : {};

  const [subscriptions, invoices] = await Promise.all([
    prisma.subscription.count({ where: { tenantId, ...dateFilter } }),
    prisma.invoice.count({ where: { tenantId, ...dateFilter } })
  ]);

  const paidInvoices = await prisma.invoice.findMany({
    where: { tenantId, status: 'PAID', ...dateFilter },
    select: { amount: true }
  });
  
  const mrr = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const arr = mrr * 12;

  return { subscriptions, invoices, mrr, arr };
}
