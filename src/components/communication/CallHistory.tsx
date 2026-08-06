'use client';
export default function CallHistory({ calls }: { calls: any[] }) {
  if (!calls || calls.length === 0) {
    return (
      <div className="text-center py-8 bg-white border border-slate-200 rounded-lg">
        <p className="text-slate-500 text-sm">No call history available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
      <ul className="divide-y divide-slate-200">
        {calls.map((call) => (
          <li key={call.id} className="p-4 hover:bg-slate-50 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-slate-900">{call.direction} CALL</p>
              <p className="text-xs text-slate-500">{new Date(call.createdAt).toLocaleString()}</p>
            </div>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
              {call.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
