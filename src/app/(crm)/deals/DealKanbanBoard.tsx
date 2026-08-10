'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { moveDealStageAction, getDealsByStageAction } from '@/modules/crm/actions/deal.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

// Props shape also includes: onCountChange so parent can track totals if needed
function KanbanColumn({ stage, handleDragStart, handleDragOver, handleDrop, router, onCountChange }: any) {
  const [deals, setDeals] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  // Separate display count: tracks known+loaded deals including those that may have left
  const [displayCount, setDisplayCount] = useState<number>(0);

  const loadInitial = async () => {
    setLoading(true);
    const res = await getDealsByStageAction(stage.id);
    if (res.success && res.data) {
      setDeals(res.data.data);
      setHasMore(res.data.hasMore);
      const lastId = res.data.data.length > 0 ? res.data.data[res.data.data.length - 1].id : undefined;
      setCursor(lastId);
      setDisplayCount(res.data.data.length);
      onCountChange?.(stage.id, res.data.data.length);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadInitial();
  }, [stage.id]);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const res = await getDealsByStageAction(stage.id, cursor);
    if (res.success && res.data) {
      setDeals(prev => {
        const merged = [...prev, ...res.data.data];
        setDisplayCount(merged.length);
        onCountChange?.(stage.id, merged.length);
        return merged;
      });
      setHasMore(res.data.hasMore);
      const lastId = res.data.data.length > 0 ? res.data.data[res.data.data.length - 1].id : cursor;
      setCursor(lastId);
    }
    setLoading(false);
  };

  // Exposed setDeals with count side effect for drag/drop synchronisation
  const setDealsWithCount = (updater: any) => {
    setDeals(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setDisplayCount(next.length);
      onCountChange?.(stage.id, next.length);
      return next;
    });
  };

  return (
    <div
      className="flex-none w-80 bg-muted/30 rounded-lg flex flex-col snap-start border"
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, stage.id, stage.isClosedLost, setDealsWithCount)}
    >
      <div className="p-3 border-b flex justify-between items-center bg-muted/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color || '#ccc' }} />
          <h3 className="font-semibold text-sm">{stage.name}</h3>
        </div>
        <Badge variant="secondary" className="text-xs font-semibold">
          {displayCount}{hasMore ? '+' : ''}
        </Badge>
      </div>
      <div
        className="p-3 flex-1 overflow-y-auto flex flex-col gap-3 min-h-[150px]"
        onScroll={(e) => {
          const target = e.target as HTMLElement;
          if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
            loadMore();
          }
        }}
      >
        {deals.map(deal => (
          <Card
            key={deal.id}
            className="cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
            draggable
            onDragStart={(e) => handleDragStart(e, deal, setDealsWithCount)}
            onClick={() => router.push(`/deals/${deal.id}`)}
          >
            <CardContent className="p-3">
              <div className="font-medium text-sm mb-1 line-clamp-1">{deal.title}</div>
              <div className="text-xs text-muted-foreground mb-2 line-clamp-1">
                {(deal.customer as any)?.company || deal.customer?.name || 'No Customer'}
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold">${deal.value.toLocaleString()}</span>
                <Badge variant="outline" className="text-[10px]">{deal.probability ?? stage.probability}%</Badge>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground flex justify-between">
                <span>{deal.assignedUser?.email?.split('@')[0]}</span>
                <span>{deal.expectedCloseDate ? format(new Date(deal.expectedCloseDate), 'MMM d') : '-'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {loading && <div className="text-center py-2"><Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" /></div>}
        {!loading && deals.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-4 italic">No deals</div>
        )}
      </div>
    </div>
  );
}

export function DealKanbanBoard({ pipeline }: { pipeline: any }) {
  const router = useRouter();

  // Drag state
  const [draggedDeal, setDraggedDeal] = useState<any>(null);
  const [sourceSetter, setSourceSetter] = useState<any>(null);

  // Modal State
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [lostTargetStage, setLostTargetStage] = useState<string>('');
  const [lostTargetSetter, setLostTargetSetter] = useState<any>(null);
  const [lostData, setLostData] = useState({ reason: '', competitor: '', notes: '' });

  const handleDragStart = (e: React.DragEvent, deal: any, setDeals: any) => {
    e.dataTransfer.setData('dealId', deal.id);
    setDraggedDeal(deal);
    setSourceSetter(() => setDeals);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const executeDrop = async (stageId: string, targetSetter: any, lostInfo?: any) => {
    if (!draggedDeal) return;
    const dealId = draggedDeal.id;

    // Optimistic Update: remove from source, add to target
    sourceSetter((prev: any[]) => prev.filter(d => d.id !== dealId));
    targetSetter((prev: any[]) => [{ ...draggedDeal, stageId }, ...prev]);

    const res = await moveDealStageAction(dealId, stageId, lostInfo?.reason, lostInfo?.competitor, lostInfo?.notes);
    if (!res.success) {
      toast.error(res.error || 'Failed to move deal');
      // Rollback
      targetSetter((prev: any[]) => prev.filter(d => d.id !== dealId));
      sourceSetter((prev: any[]) => [draggedDeal, ...prev]);
    } else {
      toast.success('Deal moved');
      router.refresh();
    }

    setDraggedDeal(null);
    setSourceSetter(null);
  };

  const handleDrop = (e: React.DragEvent, stageId: string, isLost: boolean, targetSetter: any) => {
    e.preventDefault();
    if (!draggedDeal || draggedDeal.stageId === stageId) return;

    if (isLost) {
      setLostTargetStage(stageId);
      setLostTargetSetter(() => targetSetter);
      setLostData({ reason: '', competitor: '', notes: '' });
      setLostModalOpen(true);
      return;
    }

    executeDrop(stageId, targetSetter);
  };

  const submitLostDeal = () => {
    if (!lostData.reason.trim()) return toast.error('Lost reason is required');
    setLostModalOpen(false);
    executeDrop(lostTargetStage, lostTargetSetter, lostData);
  };

  return (
    <>
      <div className="flex gap-4 h-full overflow-x-auto pb-4 snap-x">
        {pipeline.stages.map((stage: any) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            handleDragStart={handleDragStart}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
            router={router}
          />
        ))}
      </div>

      <Dialog open={lostModalOpen} onOpenChange={setLostModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Deal as Lost</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Loss *</label>
              <Input
                value={lostData.reason}
                onChange={(e) => setLostData({ ...lostData, reason: e.target.value })}
                placeholder="e.g. Price too high, Ghosted"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Competitor Lost To</label>
              <Input
                value={lostData.competitor}
                onChange={(e) => setLostData({ ...lostData, competitor: e.target.value })}
                placeholder="e.g. Acme Corp"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Notes</label>
              <Textarea
                value={lostData.notes}
                onChange={(e) => setLostData({ ...lostData, notes: e.target.value })}
                placeholder="Any other details..."
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostModalOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={submitLostDeal}>Confirm Loss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
