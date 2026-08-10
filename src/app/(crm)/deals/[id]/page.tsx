import { getDealByIdAction } from '@/modules/crm/actions/deal.actions';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { format } from 'date-fns';
import { Briefcase, Calendar, DollarSign, Target, User, Activity } from 'lucide-react';
import { DealTimeline } from '@/components/crm/DealTimeline';
import { CRMCommentSection } from '@/components/crm/CRMCommentSection';

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const dealRes = await getDealByIdAction(params.id);
  if (!dealRes.success || !dealRes.data) return notFound();

  const deal = dealRes.data;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{deal.title}</h1>
            <Badge variant={deal.status === 'WON' ? 'default' : deal.status === 'LOST' ? 'destructive' : 'secondary'}>
              {deal.status}
            </Badge>
          </div>
          <div className="text-muted-foreground flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1"><Briefcase className="w-4 h-4"/> {(deal.customer as any)?.company || deal.customer?.name || 'No Customer'}</span>
            <span className="flex items-center gap-1"><User className="w-4 h-4"/> {deal.assignedUser?.email}</span>
            <span className="flex items-center gap-1"><Target className="w-4 h-4"/> {deal.stage.name}</span>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {deal.currency} {deal.value.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">
            Probability: {deal.probability ?? deal.stage.probability}%
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="history">Stage History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Deal Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Description</div>
                  <div>{deal.description || 'No description provided.'}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Source</div>
                    <div>{deal.source || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Expected Close</div>
                    <div>{deal.expectedCloseDate ? format(new Date(deal.expectedCloseDate), 'MMM d, yyyy') : '-'}</div>
                  </div>
                </div>
                {deal.status === 'LOST' && (
                  <div className="bg-red-50 dark:bg-red-950 p-3 rounded border border-red-200 dark:border-red-900 mt-2">
                    <div className="text-sm text-red-600 dark:text-red-400 font-semibold mb-1">Lost Reason</div>
                    <div>{deal.lostReason || 'Not specified'}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Context</CardTitle>
              </CardHeader>
              <CardContent>
                {deal.customer ? (
                  <div className="grid gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Company</div>
                      <div>{(deal.customer as any)?.company || deal.customer?.industry || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Contact Email</div>
                      <div>{(deal.customer as any)?.email || deal.customer?.name || '-'}</div>
                    </div>
                    {/* Add more customer info later */}
                  </div>
                ) : (
                  <div className="text-muted-foreground italic">No associated customer.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <DealTimeline dealId={deal.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <CRMCommentSection entityType="DEAL" entityId={deal.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stage Movement History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative border-l ml-4 space-y-6">
                {deal.stageHistory.map((h: any, i: number) => (
                  <div key={h.id} className="pl-6 relative">
                    <div className="absolute w-3 h-3 bg-primary rounded-full -left-[1.5px] top-1.5 ring-4 ring-background" />
                    <div className="text-sm font-medium">
                      {h.fromStage ? `${h.fromStage.name} → ${h.toStage.name}` : `Created in ${h.toStage.name}`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(h.createdAt), 'MMM d, yyyy h:mm a')} by {h.changedBy.email}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
