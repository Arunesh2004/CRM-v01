'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getDealTimelineAction } from '@/modules/crm/actions/deal.actions';
import { format } from 'date-fns';
import { CheckCircle2, CircleDashed, Info, MessageSquare, Loader2 } from 'lucide-react';

const PAGE_LIMIT = 50;

export function DealTimeline({ dealId }: { dealId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  async function loadInitial() {
    setLoading(true);
    const res = await getDealTimelineAction(dealId, undefined, PAGE_LIMIT);
    if (res.success && res.data) {
      setEvents(res.data.events);
      setHasMore(res.data.hasMore);
      setCursor(res.data.nextCursor ?? undefined);
    } else {
      toast.error('Failed to load timeline');
    }
    setLoading(false);
  }

  useEffect(() => {
    loadInitial();
  }, [dealId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    const res = await getDealTimelineAction(dealId, cursor, PAGE_LIMIT);
    if (res.success && res.data) {
      setEvents(prev => [...prev, ...res.data.events]);
      setHasMore(res.data.hasMore);
      setCursor(res.data.nextCursor ?? undefined);
    } else {
      toast.error('Failed to load more events');
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, cursor, dealId]);

  const getIconForEvent = (event: any) => {
    switch (event.type) {
      case 'SYSTEM': return <Info className="w-4 h-4 text-blue-500" />;
      case 'COMMENT': return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'STATUS_CHANGE': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default: return <CircleDashed className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading timeline...</span>
        </div>
      ) : (
        <>
          {events.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No timeline events found.
            </div>
          ) : (
            <div className="relative border-l ml-4 space-y-6">
              {events.map((event) => (
                <div key={event.id} className="pl-6 relative">
                  <div className="absolute -left-[11px] top-1 bg-background rounded-full p-1 border">
                    {getIconForEvent(event)}
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">
                      {event.actorType === 'USER' ? 'User' : 'System'}
                    </span>{' '}
                    <span className="text-muted-foreground">{event.content}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(new Date(event.createdAt), 'MMM d, yyyy h:mm a')}
                    {event.entityType === 'LEAD' && (
                      <span className="ml-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                        from Lead
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load more older events */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Loading...</>
                ) : (
                  'Load older events'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
