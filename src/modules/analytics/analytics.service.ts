import { withTenant } from '@db/utils/prisma-tenant';
import { subMonths, startOfMonth, format, endOfMonth } from 'date-fns';

export async function getDashboardAnalytics(tenantId: string, monthsRange: number = 6) {
  const prisma = withTenant(tenantId);
  const now = new Date();
  
  const monthPromises = Array.from({ length: monthsRange }).map(async (_, index) => {
    // Reverse the index so that index 0 is (monthsRange - 1) months ago
    const i = monthsRange - 1 - index;
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
    
    const revenue = customers * 1250;

    return {
      name: monthName,
      customers,
      leads,
      revenue
    };
  });

  const chartData = await Promise.all(monthPromises);

  return chartData;
}
