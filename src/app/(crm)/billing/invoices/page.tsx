import { getInvoicesAction } from '@/modules/billing/actions/billing.actions';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FileText, Download } from 'lucide-react';
import { requireAuth } from '@/lib/auth';

export default async function BillingInvoicesPage() {
  await requireAuth();

  const res = await getInvoicesAction();
  const invoices = res.success ? (res.data || []) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" /> Invoices
          </p>
          <p className="text-sm mt-1 text-[#8891B0]">View and download your past billing invoices.</p>
        </div>
      </div>

      <Card className="glass-panel overflow-hidden border-none shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[.04] bg-[#0D1326]/50">
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Invoice ID</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Date</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Amount</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Status</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px] text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.04]">
              {invoices.map((invoice: any) => (
                <tr key={invoice.id} className="hover:bg-white/[.02] transition-colors group">
                  <td className="px-6 py-4 font-mono text-xs text-white">
                    {invoice.id.split('-')[0].toUpperCase()}
                  </td>
                  <td className="px-6 py-4 text-[#8891B0]">
                    {new Date(invoice.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-white">
                    ${invoice.amountDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={invoice.status === 'PAID' ? 'emerald' : 'slate'}>
                      {invoice.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-[#8891B0] hover:text-white transition-colors" title="Download (Demo)">
                      <Download className="w-4 h-4 ml-auto" />
                    </button>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#8891B0]">
                    No invoices found.
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
