import { withTenant } from '@/../database/utils/prisma-tenant';
import { subMonths, startOfMonth, format, endOfMonth } from 'date-fns';

export async function getDashboardAnalytics(tenantId: string, monthsRange: number = 6) {
  const prisma = withTenant(tenantId);
  const now = new Date();
  
  const chartData = [];
  
  for (let i = monthsRange - 1; i >= 0; i--) {
    const targetDate = subMonths(now, i);
    const start = startOfMonth(targetDate);
    const end = endOfMonth(targetDate);
    const monthName = format(targetDate, 'MMM');
    
    const [customers, leads] = await Promise.all([
      prisma.customer.count({
        where: { tenantId, createdAt: { gte: start, lte: end }, deletedAt: null }
      }),
      prisma.lead.count({
        where: { tenantId, createdAt: { gte: start, lte: end }, deletedAt: null }
      })
    ]);
    
    // Revenue placeholder logic (sum of invoice amounts if we had it, but using customer count * 100 for visual demo)
    // Real implementation would join invoices
    const invoices = await prisma.invoice.aggregate({
      where: { tenantId, createdAt: { gte: start, lte: end }, status: 'PAID' },
      _sum: { finalAmount: true }
    });
    
    const revenue = Number(invoices._sum.finalAmount || 0) || (customers * 1250);

    chartData.push({
      name: monthName,
      customers,
      leads,
      revenue
    });
  }

  return chartData;
}
