import { getDealByIdAction } from '@/modules/crm/actions/deal.actions';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { format } from 'date-fns';
import { Briefcase, Calendar, DollarSign, Target, User, Activity, ArrowLeft, Clock } from 'lucide-react';
import { DealTimeline } from '@/components/crm/DealTimeline';
import { CRMCommentSection } from '@/components/crm/CRMCommentSection';
import Link from 'next/link';

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const dealRes = await getDealByIdAction(params.id);
  if (!dealRes.success || !dealRes.data) return notFound();

  const deal = dealRes.data;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      
      <div className="flex items-center gap-2 text-sm text-[#8891B0] mb-2">
        <Link href="/deals" className="hover:text-white transition-colors flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Deals
        </Link>
      </div>

      {/* Header */}
      <div className="glass-panel p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C5CFC]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between w-full gap-6">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                <Target className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-display font-bold tracking-tight text-white">{deal.title}</h1>
                  <Badge variant={deal.status === 'WON' ? 'emerald' : deal.status === 'LOST' ? 'rose' : 'slate'} className="h-auto py-1 px-2.5 uppercase font-semibold text-[10px]">
                    {deal.status}
                  </Badge>
                </div>
                <div className="text-[#8891B0] flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mt-2">
                  <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 opacity-70"/> {(deal.customer as any)?.company || deal.customer?.name || 'No Customer'}</span>
                  <span className="flex items-center gap-1.5"><User className="w-4 h-4 opacity-70"/> {deal.assignedUser?.email?.split('@')[0]}</span>
                  <span className="flex items-center gap-1.5 text-white bg-white/5 px-2 py-0.5 rounded-full"><Target className="w-3.5 h-3.5 text-violet-400"/> {deal.stage.name}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="md:text-right flex flex-col justify-center">
            <div className="text-3xl font-display font-bold text-emerald-400">
              {deal.currency} {deal.value.toLocaleString()}
            </div>
            <div className="text-sm text-[#8891B0] mt-1">
              Probability: <span className="text-white font-medium">{deal.probability ?? deal.stage.probability}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-[#0D1326]/50 border border-white/[.04]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="history">Stage History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6">
              <h3 className="text-lg font-display font-semibold text-white mb-5 border-b border-white/[.04] pb-4">Deal Details</h3>
              <div className="grid gap-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#8891B0] mb-1.5">Description</div>
                  <div className="text-sm text-white leading-relaxed">{deal.description || <span className="text-[#8891B0] italic">No description provided.</span>}</div>
                </div>
                <div className="grid grid-cols-2 gap-5 p-4 rounded-xl border border-white/[.04] bg-[#0D1326]/30">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#8891B0] mb-1">Source</div>
                    <div className="text-sm text-white font-medium">{deal.source || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#8891B0] mb-1">Expected Close</div>
                    <div className="text-sm text-white font-medium">{deal.expectedCloseDate ? format(new Date(deal.expectedCloseDate), 'MMM d, yyyy') : '-'}</div>
                  </div>
                </div>
                {deal.status === 'LOST' && (
                  <div className="bg-rose-500/10 p-4 rounded-xl border border-rose-500/20 mt-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1">Lost Reason</div>
                    <div className="text-sm text-white">{deal.lostReason || 'Not specified'}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-lg font-display font-semibold text-white mb-5 border-b border-white/[.04] pb-4">Customer Context</h3>
              {deal.customer ? (
                <div className="grid gap-5">
                  <div className="p-4 rounded-xl border border-white/[.04] bg-[#0D1326]/30">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#8891B0] mb-1">Company</div>
                    <div className="text-sm text-white font-medium">{(deal.customer as any)?.company || deal.customer?.industry || '-'}</div>
                  </div>
                  <div className="p-4 rounded-xl border border-white/[.04] bg-[#0D1326]/30">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#8891B0] mb-1">Contact Email</div>
                    <div className="text-sm text-white font-medium">{(deal.customer as any)?.email || deal.customer?.name || '-'}</div>
                  </div>
                  {/* Add more customer info later */}
                </div>
              ) : (
                <div className="text-[#8891B0] text-sm italic bg-white/[.02] border border-white/[.04] rounded-xl p-4 text-center">No associated customer.</div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <div className="glass-panel p-6">
            <DealTimeline dealId={deal.id} />
          </div>
        </TabsContent>

        <TabsContent value="comments" className="mt-6">
          <div className="glass-panel p-6">
            <CRMCommentSection entityType="DEAL" entityId={deal.id} />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-display font-semibold text-white mb-6">Stage Movement History</h3>
            <div className="relative border-l border-white/[.08] ml-4 space-y-6">
              {deal.stageHistory.map((h: any, i: number) => (
                <div key={h.id} className="pl-6 relative">
                  <div className="absolute w-3 h-3 bg-violet-500 rounded-full -left-[6.5px] top-1 ring-4 ring-[#070B18]" />
                  <div className="text-sm font-medium text-white bg-white/5 inline-block px-3 py-1.5 rounded-lg border border-white/[.04]">
                    {h.fromStage ? (
                      <span className="flex items-center gap-2">
                        <span className="text-[#8891B0]">{h.fromStage.name}</span>
                        <ArrowLeft className="w-3 h-3 rotate-180 text-violet-400" />
                        <span>{h.toStage.name}</span>
                      </span>
                    ) : (
                      `Created in ${h.toStage.name}`
                    )}
                  </div>
                  <div className="text-xs text-[#8891B0] mt-2 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {format(new Date(h.createdAt), 'MMM d, yyyy h:mm a')} by {h.changedBy.email.split('@')[0]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
