'use client';

import { useState } from 'react';
import { Activity, Mail, Phone, PenSquare, Clock, CheckSquare, MessageSquare, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { UnifiedTimelineItem, UnifiedTimelineType } from '@/modules/crm/crm.types';
import { Badge } from '../ui/Badge';

export function CustomerActivityTimeline({ activities }: { activities: UnifiedTimelineItem[] }) {
  const [filter, setFilter] = useState<UnifiedTimelineType | 'ALL'>('ALL');

  if (!activities || activities.length === 0) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center border rounded-xl bg-muted/20">
        <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-foreground mb-1">No Recent Activity</h3>
        <p className="text-xs text-muted-foreground">Timeline events will appear here when interactions occur.</p>
      </div>
    );
  }

  const filteredActivities = filter === 'ALL' ? activities : activities.filter(a => a.type === filter);

  const getIcon = (type: UnifiedTimelineType) => {
    switch (type) {
      case 'EMAIL': return <Mail className="w-4 h-4" />;
      case 'CALL': return <Phone className="w-4 h-4" />;
      case 'NOTE': return <PenSquare className="w-4 h-4" />;
      case 'TASK': return <CheckSquare className="w-4 h-4" />;
      case 'MESSAGE': return <MessageSquare className="w-4 h-4" />;
      case 'SYSTEM': return <ShieldAlert className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getColorClass = (type: UnifiedTimelineType) => {
    switch (type) {
      case 'EMAIL': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 ring-blue-50';
      case 'CALL': return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 ring-green-50';
      case 'TASK': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400 ring-purple-50';
      case 'MESSAGE': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400 ring-yellow-50';
      case 'NOTE': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400 ring-orange-50';
      case 'SYSTEM': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 ring-gray-50';
      default: return 'bg-muted text-muted-foreground ring-card';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b">
        {(['ALL', 'EMAIL', 'CALL', 'TASK', 'MESSAGE', 'NOTE', 'SYSTEM'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${filter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            {f === 'ALL' ? 'All Activity' : f.charAt(0) + f.slice(1).toLowerCase() + 's'}
          </button>
        ))}
      </div>

      <div className="px-2 py-2 space-y-8 overflow-y-auto custom-scrollbar">
        {filteredActivities.length === 0 ? (
           <div className="text-center py-10 text-muted-foreground text-sm">No activities match this filter.</div>
        ) : (
          filteredActivities.map((activity) => (
            <div key={activity.id} className="relative pl-8 before:absolute before:left-[15px] before:top-10 before:bottom-[-40px] before:w-px before:bg-border last:before:hidden group">
              <div className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center ring-4 ${getColorClass(activity.type)} shadow-sm transition-transform group-hover:scale-110`}>
                {getIcon(activity.type)}
              </div>
              <div className="flex flex-col gap-1.5 bg-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start gap-4">
                  <h4 className="text-sm font-semibold text-foreground">{activity.title}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                    <Clock className="w-3 h-3" />
                    {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {activity.description}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center uppercase text-[10px]">
                      {activity.actor.name.charAt(0)}
                    </div>
                    {activity.actor.name}
                  </div>
                  {activity.metadata?.status && (
                    <Badge variant="outline" className="text-[10px] uppercase">{activity.metadata.status}</Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
