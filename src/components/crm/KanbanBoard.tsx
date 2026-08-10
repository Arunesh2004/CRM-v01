'use client';

import React, { useState } from 'react';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { updateLeadAction } from '@/modules/crm/actions/lead.actions';
import { toast } from 'sonner';

const STATUS_COLUMNS = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'];

export function KanbanBoard({ initialLeads, users }: { initialLeads: any[], users: any[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveContainer = STATUS_COLUMNS.includes(activeId);
    const isOverContainer = STATUS_COLUMNS.includes(overId);

    if (!isActiveContainer && isOverContainer) {
      setLeads((prev) => {
        const activeLead = prev.find(l => l.id === activeId);
        if (activeLead && activeLead.status !== overId) {
          return prev.map(l => l.id === activeId ? { ...l, status: overId } : l);
        }
        return prev;
      });
    } else if (!isActiveContainer && !isOverContainer) {
      const activeIndex = leads.findIndex(l => l.id === activeId);
      const overIndex = leads.findIndex(l => l.id === overId);
      
      if (leads[activeIndex].status !== leads[overIndex].status) {
        setLeads((prev) => {
          const newLeads = [...prev];
          newLeads[activeIndex].status = newLeads[overIndex].status;
          return arrayMove(newLeads, activeIndex, overIndex);
        });
      } else {
        setLeads((prev) => arrayMove(prev, activeIndex, overIndex));
      }
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const lead = leads.find(l => l.id === active.id);
    const originalLead = initialLeads.find(l => l.id === active.id);

    if (lead && originalLead && lead.status !== originalLead.status) {
      // Optimistic update occurred in dragOver, now persist
      const res = await updateLeadAction({
        id: lead.id,
        name: lead.name,
        company: lead.company,
        status: lead.status
      });

      if (res.success) {
        toast.success(`Moved lead to ${lead.status}`);
      } else {
        toast.error('Failed to move lead: ' + res.error);
        // Rollback on failure
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: originalLead.status } : l));
      }
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
        {STATUS_COLUMNS.map(status => (
          <KanbanColumn key={status} id={status} leads={leads.filter(l => l.status === status)} users={users} />
        ))}
      </div>
      
      <DragOverlay>
        {activeId ? (
          <KanbanCard lead={leads.find(l => l.id === activeId)} users={users} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
