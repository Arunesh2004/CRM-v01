import { requireAuth, requireTenant } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { FileText, CheckCircle2, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import { QuoteDetailControls } from '@/components/revenue/QuoteDetailControls';

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const quoteId = resolvedParams.id;
  
  const tenantId = await requireTenant();
  const actor = await requireAuth();
  const prisma = withTenant(tenantId);
  
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, tenantId },
    include: {
      customer: true,
      deal: true,
      owner: true,
      lineItems: {
        include: { priceBookEntry: { include: { product: true } } }
      }
    }
  });

  if (!quote) return notFound();

  // Simple permissions check for UI display
  // Real security is handled in the server actions calling RevenueService
   
  const isOwner = quote.ownerId === actor.id;
  const isApprover = actor.userRoles.some((ur) => ur.role.name === 'REVENUE_MANAGER' || ur.role.name === 'TENANT_ADMIN' || ur.role.name === 'GLOBAL_ADMIN');

  const getStatusBadge = (s: string) => {
    switch(s) {
      case 'DRAFT': return <Badge variant="slate"><Clock className="w-3 h-3 mr-1"/>Draft</Badge>;
      case 'PENDING_APPROVAL': return <Badge variant="amber"><Clock className="w-3 h-3 mr-1"/>Pending Approval</Badge>;
      case 'APPROVED': return <Badge variant="cyan"><CheckCircle2 className="w-3 h-3 mr-1"/>Approved</Badge>;
      case 'SENT': return <Badge variant="cyan"><FileText className="w-3 h-3 mr-1"/>Sent</Badge>;
      case 'ACCEPTED': return <Badge variant="emerald"><CheckCircle2 className="w-3 h-3 mr-1"/>Accepted</Badge>;
      case 'REJECTED': return <Badge variant="rose"><AlertCircle className="w-3 h-3 mr-1"/>Rejected</Badge>;
      default: return <Badge variant="slate">{s}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-8">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/quotes" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-[#8891B0]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            Quote <span className="font-mono text-sm text-[#8891B0] mt-1">{quote.id}</span>
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {getStatusBadge(quote.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="glass-panel p-6 border-none shadow-none">
            <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">Line Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-3 font-medium text-[#8891B0]">Product</th>
                    <th className="pb-3 font-medium text-[#8891B0]">Qty</th>
                    <th className="pb-3 font-medium text-[#8891B0]">Unit Price</th>
                    <th className="pb-3 font-medium text-[#8891B0]">Discount</th>
                    <th className="pb-3 font-medium text-[#8891B0] text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {quote.lineItems?.map((item) => (
                    <tr key={item.id}>
                      <td className="py-4 text-white">{item.priceBookEntry?.product?.name || item.productId}</td>
                      <td className="py-4 text-[#8891B0]">{item.quantity}</td>
                      <td className="py-4 text-[#8891B0]">${item.unitPrice.toNumber().toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 text-[#8891B0]">{item.discount}%</td>
                      <td className="py-4 text-white text-right font-medium">${item.subtotal.toNumber().toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {(!quote.lineItems || quote.lineItems.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#8891B0]">No line items found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between text-[#8891B0]">
                  <span>Subtotal</span>
                  <span>${quote.subtotal.toNumber().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[#8891B0]">
                  <span>Discount Total</span>
                  <span>-${quote.discountTotal.toNumber().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-white/10">
                  <span>Grand Total</span>
                  <span>${quote.grandTotal.toNumber().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-panel p-6 border-none shadow-none">
            <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">Details</h3>
            <div className="space-y-4 text-sm">
              <div>
                <span className="block text-[#8891B0] text-xs uppercase tracking-wider mb-1">Customer</span>
                <span className="text-white font-medium">{quote.customer?.name || '-'}</span>
              </div>
              <div>
                <span className="block text-[#8891B0] text-xs uppercase tracking-wider mb-1">Deal</span>
                <span className="text-white">{quote.deal?.title || '-'}</span>
              </div>
              <div>
                <span className="block text-[#8891B0] text-xs uppercase tracking-wider mb-1">Owner</span>
                <span className="text-white">{quote.owner?.email || '-'}</span>
              </div>
              <div>
                <span className="block text-[#8891B0] text-xs uppercase tracking-wider mb-1">Created At</span>
                <span className="text-white">{new Date(quote.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </Card>

          <Card className="glass-panel p-6 border-none shadow-none">
            <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">Actions</h3>
            <div className="space-y-3">
              <QuoteDetailControls 
                quoteId={quote.id} 
                status={quote.status} 
                isOwner={isOwner} 
                isApprover={isApprover} 
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
