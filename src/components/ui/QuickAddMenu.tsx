'use client';

import * as React from 'react';
import { Plus, Target, CheckSquare, Building2, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createLeadAction } from '@/modules/crm/actions/lead.actions';
import { createCustomerAction } from '@/modules/crm/actions/customer.actions';
import { createTaskAction } from '@/modules/crm/actions/task.actions';
import { toast } from 'sonner';

// ──────────────────────────────────────────────────────────────────────────────
// SECURITY NOTE:
// Every createXxxAction delegates directly to the service layer which calls:
//   requireAuth() → requireTenant() → requirePermission()
// The client never supplies a tenantId. Permission failures surface as
// sanitized error strings in res.error. No privileged context is assumed.
// ──────────────────────────────────────────────────────────────────────────────

type QuickFormType = 'lead' | 'customer' | 'task' | null;

// ── Minimal inline Lead form ──────────────────────────────────────────────────
function QuickLeadForm({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const res = await createLeadAction({
      name: fd.get('name') as string,
      company: fd.get('company') as string,
      email: (fd.get('email') as string) || undefined,
      phone: (fd.get('phone') as string) || undefined,
    });
    setLoading(false);
    if (res.success) {
      toast.success('Lead created');
      onClose();
      router.refresh();
    } else {
      setError(res.error || 'Failed to create lead');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <QuickField label="Name *" name="name" required placeholder="Jane Doe" />
      <QuickField label="Company *" name="company" required placeholder="Acme Corp" />
      <QuickField label="Email" name="email" type="email" placeholder="jane@acme.com" />
      <QuickField label="Phone" name="phone" placeholder="+91 98765 43210" />
      <QuickSubmit loading={loading} error={error} label="Create Lead" />
    </form>
  );
}

// ── Minimal inline Customer form ──────────────────────────────────────────────
function QuickCustomerForm({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const res = await createCustomerAction({
      name: fd.get('name') as string,
      industry: (fd.get('industry') as string) || undefined,
    });
    setLoading(false);
    if (res.success) {
      toast.success('Customer created');
      onClose();
      router.refresh();
    } else {
      setError(res.error || 'Failed to create customer');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <QuickField label="Company Name *" name="name" required placeholder="Acme Corp" />
      <QuickField label="Industry" name="industry" placeholder="SaaS / Finance / Retail…" />
      <QuickSubmit loading={loading} error={error} label="Create Customer" />
    </form>
  );
}

// ── Minimal inline Task form ──────────────────────────────────────────────────
function QuickTaskForm({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const dueDateRaw = fd.get('dueDate') as string;
    const res = await createTaskAction({
      title: fd.get('title') as string,
      priority: (fd.get('priority') as any) || 'MEDIUM',
      dueDate: dueDateRaw ? new Date(dueDateRaw) : undefined,
    });
    setLoading(false);
    if (res.success) {
      toast.success('Task created');
      onClose();
      router.refresh();
    } else {
      setError(res.error || 'Failed to create task');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <QuickField label="Task Title *" name="title" required placeholder="Follow up with lead" />
      <div>
        <label className="block text-[11px] font-medium mb-1" style={{ color: '#8891B0' }}>Priority</label>
        <select
          name="priority"
          defaultValue="MEDIUM"
          className="w-full text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500"
          style={{ background: 'rgba(20,27,51,.6)', border: '1px solid rgba(255,255,255,.08)', color: '#E7EAF5' }}
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>
      <QuickField label="Due Date" name="dueDate" type="date" />
      <QuickSubmit loading={loading} error={error} label="Create Task" />
    </form>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────
function QuickField({
  label, name, required, placeholder, type = 'text'
}: {
  label: string; name: string; required?: boolean; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium mb-1" style={{ color: '#8891B0' }}>{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full text-xs rounded-lg px-3 py-2 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        style={{ background: 'rgba(20,27,51,.6)', border: '1px solid rgba(255,255,255,.08)', color: '#E7EAF5' }}
      />
    </div>
  );
}

function QuickSubmit({ loading, error, label }: { loading: boolean; error: string; label: string }) {
  return (
    <>
      {error && (
        <p className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-white transition-all"
        style={{ background: 'linear-gradient(135deg,#7C5CFC,#9B7BFF)' }}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
        {loading ? 'Saving…' : label}
      </button>
    </>
  );
}

// ── Main QuickAddMenu component ───────────────────────────────────────────────
const QUICK_ACTIONS = [
  { type: 'lead'     as QuickFormType, label: 'New Lead',      icon: Target    },
  { type: 'customer' as QuickFormType, label: 'New Customer',  icon: Building2 },
  { type: 'task'     as QuickFormType, label: 'New Task',      icon: CheckSquare },
] as const;

const FORM_TITLES: Record<NonNullable<QuickFormType>, string> = {
  lead:     'Quick Add Lead',
  customer: 'Quick Add Customer',
  task:     'Quick Add Task',
};

export function QuickAddMenu() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [activeForm, setActiveForm] = React.useState<QuickFormType>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Close modal on Escape key
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeForm) setActiveForm(null);
        else setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeForm]);

  const closeModal = () => setActiveForm(null);

  return (
    <>
      {/* ── Trigger + dropdown ─────────────────────────────────────────── */}
      <div className="relative" ref={menuRef}>
        <button
          id="quick-add-trigger"
          onClick={() => setMenuOpen((v) => !v)}
          className="w-9 h-9 flex items-center justify-center rounded-lg grad-primary text-white card-hover ring-glow"
          title="Quick Add (Q)"
          aria-label="Quick Add"
          aria-haspopup="true"
          aria-expanded={menuOpen}
        >
          <Plus className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-48 rounded-[1rem] overflow-hidden z-50 animate-in"
            style={{
              background: 'linear-gradient(180deg, rgba(27,35,64,.95), rgba(13,19,38,.95))',
              border: '1px solid rgba(255,255,255,.08)',
              boxShadow: '0 16px 48px rgba(0,0,0,.5)',
              backdropFilter: 'blur(24px)',
            }}
          >
            <div
              className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider border-b border-white/[.05]"
              style={{ color: '#8891B0' }}
            >
              Quick Add
            </div>
            <div className="p-1.5 space-y-0.5">
              {QUICK_ACTIONS.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  role="menuitem"
                  id={`quick-add-${type}`}
                  onClick={() => { setMenuOpen(false); setActiveForm(type); }}
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

      {/* ── Modal overlay ───────────────────────────────────────────────── */}
      {activeForm && (
        <div
          id="quick-add-modal-backdrop"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={FORM_TITLES[activeForm]}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={closeModal}
          />

          {/* Panel */}
          <div
            id="quick-add-modal-panel"
            className="relative z-10 w-full max-w-sm rounded-[1.25rem] border border-white/[.08] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            style={{
              background: 'linear-gradient(180deg, rgba(20,27,51,.97), rgba(7,11,24,.97))',
              boxShadow: '0 32px 80px rgba(0,0,0,.7)',
            }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 border-b border-white/[.06] flex items-center justify-between"
              style={{ background: 'rgba(13,19,38,.6)' }}
            >
              <h2 className="text-sm font-display font-bold text-white tracking-tight">
                {FORM_TITLES[activeForm]}
              </h2>
              <button
                onClick={closeModal}
                aria-label="Close"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-[#8891B0] hover:text-white transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Form body */}
            <div className="p-5">
              {activeForm === 'lead'     && <QuickLeadForm     onClose={closeModal} />}
              {activeForm === 'customer' && <QuickCustomerForm onClose={closeModal} />}
              {activeForm === 'task'     && <QuickTaskForm     onClose={closeModal} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
