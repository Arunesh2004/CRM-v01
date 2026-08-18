import { getApprovalsAction } from '@/modules/revenue/actions/approval.actions';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default async function ApprovalsPage() {
  const result = await getApprovalsAction();
  const approvals = result.success ? result.data : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Pending Approvals
          </p>
          <p className="text-sm mt-1 text-[#8891B0]">Review and approve quotes requiring authorization.</p>
        </div>
      </div>

      <Card className="glass-panel overflow-hidden border-none shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[.04] bg-[#0D1326]/50">
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Quote ID</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Customer</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Requested By</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Total</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.04]">
              {approvals?.map((quote: any) => (
                <tr key={quote.id} className="hover:bg-white/[.02] transition-colors group">
                  <td className="px-6 py-4 font-medium text-white">
                    <span className="font-mono text-xs">{quote.id.split('-')[0]}</span>
                  </td>
                  <td className="px-6 py-4 text-[#8891B0]">
                    {quote.customer ? (
                      <Link href={`/customers/${quote.customer.id}`} className="hover:text-cyan-400 transition-colors">
                        {quote.customer.name}
                      </Link>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 text-[#8891B0]">
                    {quote.owner?.email || '-'}
                  </td>
                  <td className="px-6 py-4 font-semibold text-white">
                    ${(quote.grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-[#8891B0]">{new Date(quote.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {(!approvals || approvals.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#8891B0]">
                    No pending approvals.
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
