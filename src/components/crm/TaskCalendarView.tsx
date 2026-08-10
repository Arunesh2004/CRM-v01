'use client';

import { useState } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, isSameMonth, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckSquare } from 'lucide-react';
import Link from 'next/link';

export function TaskCalendarView({ tasks }: { tasks: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'MONTH' | 'WEEK'>('MONTH');

  const getDaysInView = () => {
    if (viewMode === 'MONTH') {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return eachDayOfInterval({ start, end });
    }
  };

  const days = getDaysInView();

  const handlePrev = () => {
    if (viewMode === 'MONTH') setCurrentDate(subMonths(currentDate, 1));
    else setCurrentDate(subWeeks(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === 'MONTH') setCurrentDate(addMonths(currentDate, 1));
    else setCurrentDate(addWeeks(currentDate, 1));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-blue-500 text-white';
      case 'LOW': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col h-full min-h-[600px]">
      {/* Calendar Header */}
      <div className="p-4 border-b flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-foreground w-48">
            {format(currentDate, viewMode === 'MONTH' ? 'MMMM yyyy' : 'MMM d, yyyy')}
          </h2>
          <div className="flex items-center rounded-md border bg-background overflow-hidden">
            <button onClick={handlePrev} className="p-2 hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-medium border-x hover:bg-muted transition-colors">Today</button>
            <button onClick={handleNext} className="p-2 hover:bg-muted transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-md border bg-background p-1">
          <button 
            onClick={() => setViewMode('MONTH')} 
            className={`px-3 py-1 text-xs font-medium rounded ${viewMode === 'MONTH' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Month
          </button>
          <button 
            onClick={() => setViewMode('WEEK')} 
            className={`px-3 py-1 text-xs font-medium rounded ${viewMode === 'WEEK' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 border-b bg-muted/10 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="p-2 text-center border-r last:border-r-0">{d}</div>
        ))}
      </div>
      
      <div className={`flex-1 grid grid-cols-7 ${viewMode === 'MONTH' ? 'auto-rows-fr' : 'auto-rows-[minmax(150px,1fr)]'}`}>
        {days.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          
          // Find tasks for this day
          const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day));

          return (
            <div key={day.toISOString()} className={`min-h-[100px] border-b border-r last:border-r-0 p-1 md:p-2 transition-colors hover:bg-muted/10 ${!isCurrentMonth && viewMode === 'MONTH' ? 'bg-muted/5 opacity-50' : 'bg-background'}`}>
              <div className="flex justify-end mb-1">
                <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </span>
              </div>
              <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                {dayTasks.map(task => (
                  <Link 
                    href={`/tasks/${task.id}`} 
                    key={task.id}
                    className={`block w-full text-left px-1.5 py-1 text-[10px] md:text-xs rounded border shadow-sm truncate hover:opacity-80 transition-opacity ${getPriorityColor(task.priority)}`}
                    title={task.title}
                  >
                    <span className={task.status === 'COMPLETED' ? 'line-through opacity-75' : ''}>
                      {task.title}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
