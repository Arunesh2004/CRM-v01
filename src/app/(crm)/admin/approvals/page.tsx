'use client';

import { useState, useEffect } from 'react';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/approvals')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch approvals');
        return res.json();
      })
      .then(data => {
        setApprovals(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Loading approvals...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Pending Approvals</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {approvals.map(approval => (
              <tr key={approval.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{approval.entityType}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{approval.entityId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{approval.status}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(approval.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {approvals.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No pending approvals.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
