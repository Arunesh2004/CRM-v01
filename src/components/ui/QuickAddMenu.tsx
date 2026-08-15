'use client';

import * as React from 'react';
import { Plus, Target, CheckSquare, Phone, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function QuickAddMenu() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  const actions = [
    { label: 'New Customer', icon: Building2, href: '/customers/new' },
    { label: 'New Lead', icon: Target, href: '/leads' },
    { label: 'New Task', icon: CheckSquare, href: '/tasks' },
    { label: 'Log Call', icon: Phone, href: '/communications' },
  ];

  const handleAction = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  // Close on outside click
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 flex items-center justify-center rounded-lg grad-primary text-white card-hover ring-glow"
        title="Quick Add"
        aria-label="Quick Add"
      >
        <Plus className="w-4 h-4" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-[1rem] overflow-hidden z-50 animate-in"
          style={{
            background: "linear-gradient(180deg, rgba(27,35,64,.9), rgba(13,19,38,.9))",
            border: "1px solid rgba(255,255,255,.08)",
            boxShadow: "0 16px 48px rgba(0,0,0,.5)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Header */}
          <div
            className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider border-b border-white/[.05]"
            style={{ color: "#8891B0" }}
          >
            Quick Add
          </div>

          {/* Items */}
          <div className="p-1.5 space-y-0.5">
            {actions.map(({ label, icon: Icon, href }) => (
              <button
                key={href}
                onClick={() => handleAction(href)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-[#E7EAF5] hover:bg-violet-500/10 hover:text-violet-300 transition-all duration-150"
              >
                <Icon className="w-3.5 h-3.5 text-violet-400" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
