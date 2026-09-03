import { withTenant } from '@db/utils/prisma-tenant';
import { checkPermissionFast } from '@/lib/auth';

export type SearchResult = {
  id: string;
  type: 'CUSTOMER' | 'LEAD' | 'TASK' | 'EMPLOYEE' | 'MESSAGE' | 'INVOICE';
  title: string;
  subtitle: string;
  url: string;
};

export async function globalSearch(tenantId: string, query: string, userId: string): Promise<SearchResult[]> {
  const prisma = withTenant(tenantId);
  const q = `%${query}%`;
  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  // Check permissions in parallel
  const [canReadCustomer, canReadLead, canReadTask, canReadUser, canReadCommunication, canReadRevenue] = await Promise.all([
    checkPermissionFast(userId, 'CUSTOMER', 'READ'),
    checkPermissionFast(userId, 'LEAD', 'READ'),
    checkPermissionFast(userId, 'TASK', 'READ'),
    checkPermissionFast(userId, 'USER', 'READ'),
    checkPermissionFast(userId, 'COMMUNICATION', 'READ'),
    checkPermissionFast(userId, 'REVENUE', 'READ')
  ]);

  // Parallel fetch for speed
  const [customers, leads, tasks, users, mails, chats, invoices] = await Promise.all([
    canReadCustomer ? prisma.customer.findMany({
      where: { tenantId, deletedAt: null, OR: [{ name: { contains: query, mode: 'insensitive' } }, { normalizedName: { contains: query, mode: 'insensitive' } }] },
      take: 5
    }) : Promise.resolve([]),
    canReadLead ? prisma.lead.findMany({
      where: { tenantId, deletedAt: null, OR: [{ name: { contains: query, mode: 'insensitive' } }, { company: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } }] },
      take: 5
    }) : Promise.resolve([]),
    canReadTask ? prisma.task.findMany({
      where: { tenantId, deletedAt: null, title: { contains: query, mode: 'insensitive' } },
      take: 5
    }) : Promise.resolve([]),
    canReadUser ? prisma.user.findMany({
      where: { tenantId, email: { contains: query, mode: 'insensitive' } },
      take: 5
    }) : Promise.resolve([]),
    canReadCommunication ? prisma.mailMessage.findMany({
      where: { tenantId, OR: [{ bodyText: { contains: query, mode: 'insensitive' } }, { bodyHtml: { contains: query, mode: 'insensitive' } }] },
      take: 5,
      include: { sender: { select: { email: true } } }
    }) : Promise.resolve([]),
    canReadCommunication ? prisma.chatMessage.findMany({
      where: { tenantId, isDeleted: false, content: { contains: query, mode: 'insensitive' } },
      take: 5,
      include: { sender: { select: { email: true } } }
    }) : Promise.resolve([]),
    canReadRevenue ? prisma.invoice.findMany({
      where: { tenantId, id: { contains: query, mode: 'insensitive' } },
      take: 5
    }) : Promise.resolve([])
  ]);

  customers.forEach(c => results.push({ id: c.id, type: 'CUSTOMER', title: c.name, subtitle: `Customer - ${c.industry || 'No Industry'}`, url: `/customers/${c.id}` }));
  leads.forEach(l => results.push({ id: l.id, type: 'LEAD', title: l.name, subtitle: `Lead - ${l.company}`, url: `/leads/${l.id}` }));
  tasks.forEach(t => results.push({ id: t.id, type: 'TASK', title: t.title, subtitle: `Task - ${t.status}`, url: `/tasks/${t.id}` }));
  users.forEach(u => results.push({ id: u.id, type: 'EMPLOYEE', title: u.email, subtitle: `Employee`, url: `/employees/${u.id}` }));
  
  mails.forEach(m => {
    const textSnippet = m.bodyText ? m.bodyText.substring(0, 50) + '...' : 'Email Message';
    results.push({ id: m.id, type: 'MESSAGE', title: `Email from ${m.sender?.email || 'Unknown'}`, subtitle: textSnippet, url: `/communication/mail/${m.threadId}` });
  });
  
  chats.forEach(c => {
    const textSnippet = c.content.substring(0, 50) + '...';
    results.push({ id: c.id, type: 'MESSAGE', title: `Chat from ${c.sender?.email || 'Unknown'}`, subtitle: textSnippet, url: `/communication/chat/${c.conversationId}` });
  });
  
  invoices.forEach(i => results.push({ id: i.id, type: 'INVOICE', title: `Invoice #${i.id.split('-')[0]}`, subtitle: `Status: ${i.status} - $${i.amountDue}`, url: `/billing/invoices` }));

  return results;
}
