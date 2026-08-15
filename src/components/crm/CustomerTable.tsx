'use client';
import { useState } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import { Users } from 'lucide-react';

const statusBadge: Record<string, string> = {
  ACTIVE:   'badge-emerald',
  INACTIVE: 'badge-slate',
  AT_RISK:  'badge-amber',
  CHURNED:  'badge-rose',
};

export default function CustomerTable({
  initialCustomers,
  canCreate,
}: {
  initialCustomers: any[];
  canCreate: boolean;
}) {
  const [customers] = useState(initialCustomers);

  if (!customers || customers.length === 0) {
    return (
      <EmptyState
        title="No customers yet"
        description="Convert a lead to create your first customer."
        icon={<Users className="w-6 h-6" />}
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
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Industry</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Since</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {customers.map((customer: any) => (
              <tr key={customer.id} className="border-b border-white/[.05] last:border-0">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar initials */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: "linear-gradient(135deg,#7C5CFC,#9B7BFF)" }}
                    >
                      {customer.name?.[0]?.toUpperCase() || "C"}
                    </div>
                    <div>
                      <p className="font-medium text-white">{customer.name}</p>
                      {customer.email && (
                        <p className="text-[11px] text-slate-400">{customer.email}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-400">{customer.industry || "—"}</td>
                <td className="py-3 px-4">
                  <span className={`badge ${statusBadge[customer.status] ?? 'badge-slate'}`}>
                    {customer.status?.replace(/_/g, " ") || "Active"}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400 font-mono text-xs">
                  {customer.createdAt
                    ? new Date(customer.createdAt).toLocaleDateString("en-IN")
                    : "—"}
                </td>
                <td className="py-3 px-4 text-right">
                  <Link
                    href={`/customers/${customer.id}`}
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

      {/* Footer */}
      <div
        className="flex items-center justify-between px-4 py-3 text-xs border-t border-white/[.05]"
        style={{ color: "#8891B0" }}
      >
        <span>Showing {customers.length} customers</span>
      </div>
    </div>
  );
}
