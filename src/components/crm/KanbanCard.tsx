'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Mail, User2, Calendar } from 'lucide-react';
import { LeadActions } from './LeadActions';
import { useRouter } from 'next/navigation';

const priorityBadge: Record<string, string> = {
  HIGH:   'badge-rose',
  MEDIUM: 'badge-amber',
  LOW:    'badge-slate',
};

export function KanbanCard({ lead, users, isOverlay = false }: { lead: any, users: any[], isOverlay?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: lead });
  const router = useRouter();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  if (!lead) return null;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        onClick={() => !isDragging && router.push(`/leads/${lead.id}`)}
        className={`kanban-card glass rounded-[.85rem] p-3 group ${isOverlay ? 'cursor-grabbing scale-105 rotate-1' : 'cursor-grab'}`}
      >
        {/* Company + Name */}
        <p className="text-[12.5px] font-medium text-white truncate">{lead.name}</p>
        {lead.company && (
          <p className="text-[11px] text-slate-400 truncate mt-0.5">{lead.company}</p>
        )}

        {/* Contact info */}
        {lead.email && (
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400 truncate">
            <Mail className="w-3 h-3 shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2.5">
          {/* Priority badge */}
          <span className={`badge ${priorityBadge[lead.priority] ?? 'badge-slate'}`}>
            {lead.priority || "—"}
          </span>

          {/* Due date if available */}
          {lead.createdAt && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>

        {/* Assignee row */}
        <div className="flex items-center justify-between mt-2">
          {lead.assignedUser?.email ? (
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] text-white font-bold"
                style={{ background: "linear-gradient(135deg,#7C5CFC,#9B7BFF)" }}
              >
                {lead.assignedUser.email.charAt(0).toUpperCase()}
              </div>
              <span className="text-[10px] text-slate-400 truncate max-w-[90px]">
                {lead.assignedUser.email.split("@")[0]}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <User2 className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] text-slate-500 italic">Unassigned</span>
            </div>
          )}

          {/* Actions */}
          <div
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <LeadActions leadId={lead.id} users={users} />
          </div>
        </div>
      </div>
    </div>
  );
}
