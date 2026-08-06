'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateIncidentStatusAction, resolveIncidentAction } from '@/modules/incident/actions/incident.actions';

export function IncidentClientTable({ incidents }: { incidents: any[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleResolve = async (id: string) => {
    setLoadingId(id);
    await resolveIncidentAction(id);
    setLoadingId(null);
    router.refresh();
  };

  const handleInvestigate = async (id: string) => {
    setLoadingId(id);
    await updateIncidentStatusAction({ id, status: 'INVESTIGATING' });
    setLoadingId(null);
    router.refresh();
  };

  const getSeverityBadge = (severity: string) => {
    const map: any = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800 animate-pulse',
    };
    return <span className={`px-2 py-1 rounded text-xs font-bold ${map[severity] || ''}`}>{severity}</span>;
  };

  const getStatusBadge = (status: string) => {
    const map: any = {
      OPEN: 'bg-red-100 text-red-800',
      INVESTIGATING: 'bg-blue-100 text-blue-800',
      RESOLVED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800',
    };
    return <span className={`px-2 py-1 rounded text-xs font-bold ${map[status] || ''}`}>{status}</span>;
  };

  if (incidents.length === 0) {
    return (
      <div className="bg-white rounded shadow p-12 text-center text-gray-500">
        <h3 className="text-lg font-bold mb-2">No security incidents</h3>
        <p>There are no active security incidents to investigate.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded shadow overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-50">
          <tr className="border-b">
            <th className="py-3 px-4">Title</th>
            <th className="py-3 px-4">Severity</th>
            <th className="py-3 px-4">Location</th>
            <th className="py-3 px-4">Camera</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Created Time</th>
            <th className="py-3 px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident: any) => (
            <tr key={incident.id} className="border-b hover:bg-gray-50">
              <td className="py-3 px-4 font-medium">{incident.title}</td>
              <td className="py-3 px-4">{getSeverityBadge(incident.severity)}</td>
              <td className="py-3 px-4">{incident.location?.name || 'Unknown'}</td>
              <td className="py-3 px-4">{incident.camera?.name || 'Unknown'}</td>
              <td className="py-3 px-4">{getStatusBadge(incident.status)}</td>
              <td className="py-3 px-4 text-sm text-gray-500">{new Date(incident.createdAt).toLocaleString()}</td>
              <td className="py-3 px-4 space-x-2">
                {incident.status === 'OPEN' && (
                  <button 
                    onClick={() => handleInvestigate(incident.id)}
                    disabled={loadingId === incident.id}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                  >
                    Investigate
                  </button>
                )}
                {(incident.status === 'OPEN' || incident.status === 'INVESTIGATING') && (
                  <button 
                    onClick={() => handleResolve(incident.id)}
                    disabled={loadingId === incident.id}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                  >
                    Resolve
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
