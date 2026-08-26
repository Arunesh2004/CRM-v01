'use client';

import React, { useState, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { updateLeadStatusAction } from '@/modules/crm/actions/lead.actions';
import { toast } from 'sonner';

// Allowlist matches Prisma LeadStatus enum exactly
const STATUS_COLUMNS = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] as const;
type LeadStatus = typeof STATUS_COLUMNS[number];

function isValidStatus(s: string): s is LeadStatus {
  return (STATUS_COLUMNS as readonly string[]).includes(s);
}

export function KanbanBoard({ initialLeads, users }: { initialLeads: any[]; users: any[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Track the committed (server-confirmed) status for every lead.
  // This ref is updated only after a *successful* server round-trip,
  // so multi-drag rollback always has an accurate baseline.
  const committedStatus = useRef<Record<string, string>>(
    Object.fromEntries(initialLeads.map((l) => [l.id, l.status]))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeLeadId = active.id as string;
    const overId = over.id as string;

    if (activeLeadId === overId) return;

    const isOverContainer = isValidStatus(overId);

    if (isOverContainer) {
      // Dropped directly onto a column header
      setLeads((prev) =>
        prev.map((l) =>
          l.id === activeLeadId && l.status !== overId ? { ...l, status: overId } : l
        )
      );
    } else {
      // Dropped onto another card — find that card's column
      const overLead = leads.find((l) => l.id === overId);
      if (!overLead) return;

      const activeIndex = leads.findIndex((l) => l.id === activeLeadId);
      const overIndex = leads.findIndex((l) => l.id === overId);

      if (leads[activeIndex].status !== overLead.status) {
        setLeads((prev) => {
          const next = [...prev];
          next[activeIndex] = { ...next[activeIndex], status: overLead.status };
          return arrayMove(next, activeIndex, overIndex);
        });
      } else {
        setLeads((prev) => arrayMove(prev, activeIndex, overIndex));
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active } = event;
    const leadId = active.id as string;
    setActiveId(null);

    const currentLead = leads.find((l) => l.id === leadId);
    if (!currentLead) return;

    const previousStatus = committedStatus.current[leadId];

    // No-op if status hasn't actually changed from last committed state
    if (!previousStatus || currentLead.status === previousStatus) return;

    const targetStatus = currentLead.status;

    // Persist via the dedicated Kanban action — tenant+auth+permission enforced server-side
    const res = await updateLeadStatusAction({ id: leadId, status: targetStatus });

    if (res.success) {
      // Update committed baseline after confirmed persistence
      committedStatus.current[leadId] = targetStatus;
      toast.success(`Lead moved to ${targetStatus.replace(/_/g, ' ')}`);
    } else {
      // Rollback to last committed status
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: previousStatus } : l))
      );
      toast.error(res.error || 'Failed to update lead stage — changes reverted');
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex space-x-4 h-[75vh] min-w-max items-start custom-scrollbar">
        {STATUS_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            id={status}
            leads={leads.filter((l) => l.status === status)}
            users={users}
          />
        ))}
      </div>

      <DragOverlay>
        {activeId ? (
          <KanbanCard
            lead={leads.find((l) => l.id === activeId)}
            users={users}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
