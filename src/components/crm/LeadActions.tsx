'use client';

import { useState } from 'react';
import { assignLeadAction, convertLeadAction, deleteLeadAction } from '@/modules/crm/actions/lead.actions';

export function LeadActions({ leadId, users }: { leadId: string; users: { id: string; email: string }[] }) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  const handleAssign = async () => {
    if (!selectedUserId) return;
    const res = await assignLeadAction(leadId, selectedUserId);
    if (res.success) {
      alert('Lead assigned successfully');
      window.location.reload();
    } else {
      alert('Error assigning lead: ' + res.error);
    }
  };

  const handleConvert = async () => {
    if (confirm('Are you sure you want to convert this lead to a customer?')) {
      const res = await convertLeadAction(leadId);
      if (res.success) {
        alert('Lead converted to customer successfully');
        window.location.reload();
      } else {
        alert('Error converting lead: ' + res.error);
      }
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this lead?')) {
      const res = await deleteLeadAction(leadId);
      if (res.success) {
        alert('Lead deleted successfully');
        window.location.reload();
      } else {
        alert('Error deleting lead: ' + res.error);
      }
    }
  };

  return (
    <div className="flex flex-col space-y-2 mt-3 pt-3 border-t border-gray-100 text-xs">
      <div className="flex space-x-2">
        <button onClick={() => setIsAssigning(!isAssigning)} className="bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100">
          Assign
        </button>
        <button onClick={handleConvert} className="bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100">
          Convert
        </button>
        <button onClick={handleDelete} className="bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100">
          Delete
        </button>
      </div>

      {isAssigning && (
        <div className="flex space-x-2 mt-2">
          <select 
            value={selectedUserId} 
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="border border-gray-300 rounded px-1 py-1 flex-1"
          >
            <option value="">Select User...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.email}</option>
            ))}
          </select>
          <button onClick={handleAssign} className="bg-blue-600 text-white px-2 py-1 rounded">
            Save
          </button>
        </div>
      )}
    </div>
  );
}
