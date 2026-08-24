import { getTicketsAction } from '@/modules/support/actions/ticket.actions';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { AlertCircle, CheckCircle2, Clock, Ticket as TicketIcon } from 'lucide-react';
import { TicketForm } from '@/components/crm/TicketForm';
import { withTenant } from '@db/utils/prisma-tenant';
import { requireTenant } from '@/lib/auth';
import Link from 'next/link';

export default async function TicketsPage() {
  const result = await getTicketsAction();
  const tickets = result.success ? result.data : [];
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);
  const customers = await prisma.customer.findMany({
    where: { tenantId },
    select: { id: true, name: true }
  });

  const getPriorityBadge = (p: string) => {
    switch(p) {
      case 'URGENT': return <Badge variant="rose">Urgent</Badge>;
      case 'HIGH': return <Badge variant="amber">High</Badge>;
      case 'MEDIUM': return <Badge variant="cyan">Medium</Badge>;
      case 'LOW': return <Badge variant="slate">Low</Badge>;
      default: return <Badge variant="slate">{p}</Badge>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch(s) {
      case 'OPEN': return <Badge variant="rose"><AlertCircle className="w-3 h-3 mr-1"/>Open</Badge>;
      case 'IN_PROGRESS': return <Badge variant="amber"><Clock className="w-3 h-3 mr-1"/>In Progress</Badge>;
      case 'WAITING_ON_CUSTOMER': return <Badge variant="cyan"><Clock className="w-3 h-3 mr-1"/>Waiting</Badge>;
      case 'RESOLVED': return <Badge variant="emerald"><CheckCircle2 className="w-3 h-3 mr-1"/>Resolved</Badge>;
      case 'CLOSED': return <Badge variant="slate"><CheckCircle2 className="w-3 h-3 mr-1"/>Closed</Badge>;
      default: return <Badge variant="slate">{s}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white flex items-center gap-2">
            <TicketIcon className="w-5 h-5 text-cyan-400" /> Support Tickets
          </p>
          <p className="text-sm mt-1 text-[#8891B0]">Manage customer issues and requests.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <TicketForm customers={customers} />
        </div>
      </div>

      <Card className="glass-panel overflow-hidden border-none shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[.04] bg-[#0D1326]/50">
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Subject</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Customer</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Status</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Priority</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.04]">
              {tickets?.map((ticket: any) => (
                <tr key={ticket.id} className="hover:bg-white/[.02] transition-colors group">
                  <td className="px-6 py-4 font-medium text-white">
                    <Link href={`/tickets/${ticket.id}`} className="hover:underline">
                      {ticket.subject}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-[#8891B0]">{ticket.customer?.name || '-'}</td>
                  <td className="px-6 py-4">{getStatusBadge(ticket.status)}</td>
                  <td className="px-6 py-4">{getPriorityBadge(ticket.priority)}</td>
                  <td className="px-6 py-4 text-[#8891B0]">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {(!tickets || tickets.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#8891B0]">
                    No tickets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
