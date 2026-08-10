'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/Card';
import { Mail, User2 } from 'lucide-react';
import { LeadActions } from './LeadActions';
import { useRouter } from 'next/navigation';

export function KanbanCard({ lead, users, isOverlay = false }: { lead: any, users: any[], isOverlay?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lead.id, data: lead });
  const router = useRouter();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!lead) return null;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card 
        onClick={() => !isDragging && router.push(`/leads/${lead.id}`)}
        className={`group hover:border-accent hover:shadow-md transition-all ${isOverlay ? 'cursor-grabbing scale-105 shadow-xl rotate-2' : 'cursor-grab'} bg-card`}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3 gap-2">
            <div className="font-bold text-sm truncate pr-2 text-foreground" title={lead.company}>
              {lead.company}
            </div>
          </div>
          
          <div className="text-xs font-semibold text-primary mb-2 truncate" title={lead.name}>
            {lead.name}
          </div>

          <div className="space-y-1.5 mb-4">
            {lead.email && (
              <div className="flex items-center text-xs text-muted-foreground truncate" title={lead.email}>
                <Mail className="w-3.5 h-3.5 mr-1.5 shrink-0 opacity-70" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center text-xs text-muted-foreground truncate" title={lead.phone}>
                <span className="w-3.5 h-3.5 mr-1.5 shrink-0 opacity-70 inline-block text-center font-serif text-[10px]">☎</span>
                <span className="truncate">{lead.phone}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-2 pt-3 border-t border-muted/50">
            <div className="flex flex-col gap-1">
              {lead.assignedUser?.email ? (
                <div className="flex items-center gap-1.5" title={`Owner: ${lead.assignedUser.email}`}>
                  <div className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-bold shrink-0">
                    {lead.assignedUser.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium truncate max-w-[90px]">
                    {lead.assignedUser.email}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5" title="Unassigned">
                  <User2 className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  <div className="text-[10px] text-muted-foreground italic">Unassigned</div>
                </div>
              )}
              <div className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-medium" title="Created At">
                Added {new Date(lead.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div 
              className="opacity-0 group-hover:opacity-100 transition-opacity self-end pb-1"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <LeadActions leadId={lead.id} users={users} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
