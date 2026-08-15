'use client';
import { useState } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import { Target } from 'lucide-react';

// Nexus CRM badge variants for lead statuses
const statusBadge: Record<string, string> = {
  NEW:         'badge-violet',
  CONTACTED:   'badge-cyan',
  QUALIFIED:   'badge-amber',
  NEGOTIATION: 'badge-amber',
  WON:         'badge-emerald',
  LOST:        'badge-rose',
  CONVERTED:   'badge-emerald',
};

const priorityBadge: Record<string, string> = {
  HIGH:   'badge-rose',
  MEDIUM: 'badge-amber',
  LOW:    'badge-slate',
};

export default function LeadTable({
  initialLeads,
  canCreate,
}: {
  initialLeads: any[];
  canCreate: boolean;
}) {
  const [leads] = useState(initialLeads);

  if (!leads || leads.length === 0) {
    return (
      <EmptyState
        title="No leads yet"
        description="Get started by adding a new lead."
        icon={<Target className="w-6 h-6" />}
        action={
          canCreate ? (
            <Link href="/leads/new" className="btn-primary text-sm">
              <Target className="w-3.5 h-3.5" />
              Add Lead
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div
      className="rounded-[1.1rem] border border-white/[.08] overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(27,35,64,.65), rgba(13,19,38,.65))",
        boxShadow: "0 8px 32px rgba(0,0,0,.35)",
      }}
    >
      <div className="overflow-x-auto">
        <table className="data-table w-full text-sm">
          <thead>
            <tr className="text-left border-b border-white/[.05]">
              <th className="py-3 px-4">Lead</th>
              <th className="py-3 px-4">Company</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Source</th>
              <th className="py-3 px-4">Owner</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {leads.map((lead: any) => (
              <tr key={lead.id} className="border-b border-white/[.05] last:border-0">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: "rgba(124,92,252,.15)" }}
                    >
                      {lead.name?.[0]?.toUpperCase() || "L"}
                    </div>
                    <div>
                      <p className="font-medium text-white">{lead.name}</p>
                      {lead.email && (
                        <p className="text-[11px] text-slate-400">{lead.email}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-400">{lead.company || "—"}</td>
                <td className="py-3 px-4">
                  <span className={`badge ${statusBadge[lead.status] ?? 'badge-slate'}`}>
                    {lead.status?.replace(/_/g, " ") || "New"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`badge ${priorityBadge[lead.priority] ?? 'badge-slate'}`}>
                    {lead.priority || "—"}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400 text-xs">{lead.source || "—"}</td>
                <td className="py-3 px-4 text-slate-400 text-xs">
                  {lead.owner?.email?.split("@")[0] || "—"}
                </td>
                <td className="py-3 px-4 text-right">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="text-slate-400 hover:text-violet-400 transition-colors text-xs font-medium"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="flex items-center justify-between px-4 py-3 text-xs border-t border-white/[.05]"
        style={{ color: "#8891B0" }}
      >
        <span>Showing {leads.length} leads</span>
      </div>
    </div>
  );
}
