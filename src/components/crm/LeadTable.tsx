'use client';
import { useState, useEffect } from 'react';

export default function LeadTable({ initialLeads, canCreate }: { initialLeads: any[], canCreate: boolean }) {
  const [leads, setLeads] = useState(initialLeads);

  if (!leads || leads.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
        <h3 className="text-lg font-medium text-slate-900">No leads found</h3>
        <p className="text-sm text-slate-500 mt-1">Get started by adding a new lead.</p>
        {canCreate && <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Add Lead</button>}
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Company</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {leads.map((lead: any) => (
            <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{lead.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{lead.company}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{lead.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
