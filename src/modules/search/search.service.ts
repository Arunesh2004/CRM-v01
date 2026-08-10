import { withTenant } from '@/../database/utils/prisma-tenant';

export type SearchResult = {
  id: string;
  type: 'CUSTOMER' | 'LEAD' | 'TASK' | 'EMPLOYEE';
  title: string;
  subtitle: string;
  url: string;
};

export async function globalSearch(tenantId: string, query: string): Promise<SearchResult[]> {
  const prisma = withTenant(tenantId);
  const q = `%${query}%`;
  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  // Parallel fetch for speed
  const [customers, leads, tasks, users] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId, deletedAt: null, OR: [{ name: { contains: query, mode: 'insensitive' } }, { normalizedName: { contains: query, mode: 'insensitive' } }] },
      take: 5
    }),
    prisma.lead.findMany({
      where: { tenantId, deletedAt: null, OR: [{ name: { contains: query, mode: 'insensitive' } }, { company: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } }] },
      take: 5
    }),
    prisma.task.findMany({
      where: { tenantId, deletedAt: null, title: { contains: query, mode: 'insensitive' } },
      take: 5
    }),
    prisma.user.findMany({
      where: { tenantId, email: { contains: query, mode: 'insensitive' } },
      take: 5
    })
  ]);

  customers.forEach(c => results.push({ id: c.id, type: 'CUSTOMER', title: c.name, subtitle: `Customer - ${c.industry || 'No Industry'}`, url: `/customers/${c.id}` }));
  leads.forEach(l => results.push({ id: l.id, type: 'LEAD', title: l.name, subtitle: `Lead - ${l.company}`, url: `/leads` }));
  tasks.forEach(t => results.push({ id: t.id, type: 'TASK', title: t.title, subtitle: `Task - ${t.status}`, url: `/tasks` }));
  users.forEach(u => results.push({ id: u.id, type: 'EMPLOYEE', title: u.email, subtitle: `Employee`, url: `/settings/employees` }));

  return results;
}
