'use client';

import React, { useState, useEffect } from 'react';
import { Phone, User as UserIcon } from 'lucide-react';
import { initiateCallAction } from '@/modules/communication/actions/call.actions';
import { getPresenceAction } from '@/modules/communication/actions/presence.actions';

const MOCK_USERS = [
  { id: '123e4567-e89b-12d3-a456-426614174000', firstName: 'Alice', lastName: 'Admin' },
  { id: '987fcdeb-51a2-43d7-9012-345678901234', firstName: 'Bob', lastName: 'Employee' },
];

export default function CallDirectory({ userId, tenantId }: { userId: string, tenantId: string }) {
  const [users, setUsers] = useState<any[]>(MOCK_USERS); // We would fetch tenant users here, but we can simulate a list for the UI skeleton
  const [presences, setPresences] = useState<Record<string, any>>({});
  const [callingId, setCallingId] = useState<string | null>(null);

  useEffect(() => {
    // This is where we'd fetch tenant users via a server action. 
    // For now, assume we have an action or we just list the current user as a test target.
    // In a real implementation, we'd fetch actual users.

    const fetchPresence = async () => {
      try {
        const res = await getPresenceAction(MOCK_USERS.map(u => u.id));
        if (res.success) {
          const pMap: Record<string, any> = {};
          res.data.forEach((p: any) => pMap[p.userId] = p);
          setPresences(pMap);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchPresence();
  }, []);

  const handleCall = async (recipientId: string) => {
    setCallingId(recipientId);
    try {
      await initiateCallAction(recipientId);
      // The WebRTCCallManager will pick up the active state and show the calling UI automatically
    } catch (e) {
      console.error('Call failed', e);
      alert('Could not initiate call');
    } finally {
      setCallingId(null);
    }
  };

  return (
    <div className="bg-white border rounded-lg shadow-sm p-6 max-w-2xl mx-auto mt-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Internal Directory</h2>
      <div className="space-y-4">
        {users.map(u => {
          const presence = presences[u.id];
          const isOnline = presence?.status === 'ONLINE';
          
          return (
            <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center relative">
                  <UserIcon className="w-6 h-6 text-gray-500" />
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{u.firstName} {u.lastName}</h3>
                  <p className="text-sm text-gray-500">{isOnline ? 'Online' : 'Offline'}</p>
                </div>
              </div>
              <button
                onClick={() => handleCall(u.id)}
                disabled={callingId === u.id || u.id === userId}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Phone className="w-4 h-4" />
                {callingId === u.id ? 'Calling...' : 'Call'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
