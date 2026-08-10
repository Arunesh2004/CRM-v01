'use client';

import * as React from 'react';
import { Plus, User, Target, CheckSquare, Phone, MapPin, Building2, UserPlus, StickyNote } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function QuickAddMenu() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const actions = [
    { label: 'Create Customer', icon: <Building2 className="w-4 h-4" />, href: '/customers/new' },
    { label: 'Create Lead', icon: <Target className="w-4 h-4" />, href: '/leads' },
    { label: 'Create Task', icon: <CheckSquare className="w-4 h-4" />, href: '/tasks' },
    { label: 'Log Call', icon: <Phone className="w-4 h-4" />, href: '/communications' },
  ];

  const handleAction = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
      >
        <Plus className="w-5 h-5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 w-48 bg-card border rounded-lg shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2">
            <div className="px-3 py-2 border-b bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Quick Add
            </div>
            <div className="p-1">
              {actions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleAction(action.href)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                >
                  <span className="text-muted-foreground">{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
