'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';

// Map column IDs to Nexus CRM badge colors
const columnBadge: Record<string, string> = {
  NEW:         'badge-violet',
  CONTACTED:   'badge-cyan',
  QUALIFIED:   'badge-amber',
  CONVERTED:   'badge-emerald',
  LOST:        'badge-rose',
};

export function KanbanColumn({ id, leads, users }: { id: string; leads: any[]; users: any[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={`kanban-col flex flex-col rounded-[1.1rem] border border-white/[.08] shrink-0 transition-all duration-200 ${isOver ? 'border-violet-500/40 bg-violet-500/[.04]' : ''}`}
      style={{
        background: isOver
          ? "rgba(124,92,252,.06)"
          : "linear-gradient(180deg, rgba(27,35,64,.65), rgba(13,19,38,.65))",
        boxShadow: "0 8px 32px rgba(0,0,0,.35)",
      }}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-3 border-b border-white/[.05] sticky top-0 z-10 rounded-t-[1.1rem]"
        style={{ background: "rgba(13,19,38,.8)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-2">
          <span className={`badge ${columnBadge[id] ?? 'badge-slate'}`}>
            {id.replace(/_/g, " ")}
          </span>
        </div>
        <span className="text-[10px]" style={{ color: "#8891B0" }}>
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className="p-2.5 space-y-2 overflow-y-auto flex-1 min-h-[120px]"
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
