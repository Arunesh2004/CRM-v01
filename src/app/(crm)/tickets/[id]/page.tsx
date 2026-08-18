import { notFound } from 'next/navigation';
import { getTicketByIdAction } from '@/modules/support/actions/ticket.actions';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { AlertCircle, Calendar, CheckCircle2, Clock, Ticket as TicketIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const result = await getTicketByIdAction(params.id);
  
  if (!result.success || !result.data) {
    notFound();
  }

  const ticket = result.data;

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
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto px-4 py-8">
      
      <div className="flex items-center gap-2 text-sm text-[#8891B0] mb-2">
        <Link href="/tickets" className="hover:text-white transition-colors flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Tickets
        </Link>
      </div>

      <div className="glass-panel p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C5CFC]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10 space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold tracking-tight text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <TicketIcon className="w-5 h-5 text-cyan-400" />
              </div>
              {ticket.subject}
            </h1>
          </div>
          <div className="text-sm text-[#8891B0] flex items-center gap-4 flex-wrap ml-14">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 opacity-70" /> 
              Created {new Date(ticket.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-3 mt-2 md:mt-0 ml-14 md:ml-0">
          {getStatusBadge(ticket.status)}
          {getPriorityBadge(ticket.priority)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-display font-semibold text-white mb-4">Description</h3>
            <div className="text-sm text-[#E7EAF5] leading-relaxed whitespace-pre-wrap min-h-[100px] bg-[#0D1326]/30 p-4 rounded-xl border border-white/[.04]">
              {ticket.description || <span className="text-[#8891B0] italic">No description provided.</span>}
            </div>
          </div>
          
          {/* We'd add thread UI here later if needed, right now we just meet connectivity baseline */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-display font-semibold text-white mb-4">Messages</h3>
            <div className="space-y-4">
              {ticket.messages?.map((msg: any) => (
                <div key={msg.id} className={`p-4 rounded-xl border ${msg.senderType === 'USER' ? 'bg-[#7C5CFC]/10 border-[#7C5CFC]/20' : 'bg-[#0D1326]/30 border-white/[.04]'}`}>
                  <p className="text-xs text-[#8891B0] mb-2">{msg.senderType} - {new Date(msg.createdAt).toLocaleString()}</p>
                  <p className="text-sm text-white whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
              {(!ticket.messages || ticket.messages.length === 0) && (
                <div className="text-sm text-[#8891B0] italic">No messages yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {ticket.customer && (
            <div className="glass-panel p-6">
              <h3 className="text-md font-display font-semibold text-white mb-4">Customer Details</h3>
              <div className="p-4 rounded-xl border border-white/[.04] bg-[#0D1326]/40">
                <p className="text-sm font-medium text-white">{ticket.customer.name}</p>
                <p className="text-xs text-[#8891B0] mt-1">{ticket.customer.email}</p>
                <Link href={`/customers/${ticket.customer.id}`} className="text-xs text-cyan-400 hover:text-cyan-300 mt-3 inline-block">
                  View Profile &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
