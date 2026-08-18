import { getCallsAction } from '@/modules/communication/actions/call.actions';
import { Card } from '@/components/ui/Card';
import { Phone, Clock, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

export default async function CommunicationCallsPage() {
  const result = await getCallsAction();
  const calls = result.success ? result.data : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white flex items-center gap-2">
            <Phone className="w-5 h-5 text-emerald-400" /> Call Logs
          </p>
          <p className="text-sm mt-1 text-[#8891B0]">View Twilio call history, recordings, and AI transcripts.</p>
        </div>
      </div>

      <Card className="glass-panel overflow-hidden border-none shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[.04] bg-[#0D1326]/50">
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Time</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Direction</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Contact</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Duration</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.04]">
              {calls?.map((call: any) => (
                <tr key={call.id} className="hover:bg-white/[.02] transition-colors group">
                  <td className="px-6 py-4 text-[#8891B0]">
                    {new Date(call.startTime).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={call.direction === 'INBOUND' ? 'emerald' : 'cyan'}>
                      {call.direction}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {call.customer ? (
                      <Link href={`/customers/${call.customer.id}`} className="text-cyan-400 hover:underline">{call.customer.name}</Link>
                    ) : call.lead ? (
                      <Link href={`/leads/${call.lead.id}`} className="text-violet-400 hover:underline">{call.lead.companyName}</Link>
                    ) : (
                      <span className="text-[#8891B0]">{call.phoneNumber}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[#8891B0]">
                    {call.durationSeconds}s
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="slate">{call.status}</Badge>
                    {call.recordingUrl && <Badge variant="slate" className="ml-2">Recording</Badge>}
                  </td>
                </tr>
              ))}
              {(!calls || calls.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#8891B0]">
                    No call logs found.
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
