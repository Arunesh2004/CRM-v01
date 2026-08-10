'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/Badge';
import { KanbanCard } from './KanbanCard';

export function KanbanColumn({ id, leads, users }: { id: string, leads: any[], users: any[] }) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="w-80 flex flex-col max-h-full bg-muted/30 rounded-xl border shrink-0">
      <div className="p-4 border-b bg-card rounded-t-xl flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <h3 className="font-semibold text-sm text-primary tracking-wide">{id}</h3>
        <Badge variant="secondary" className="bg-muted">
          {leads.length}
        </Badge>
      </div>
      
      <div 
        ref={setNodeRef}
        className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar min-h-[150px]"
      >
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <KanbanCard key={lead.id} lead={lead} users={users} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
