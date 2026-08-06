'use client';

export default function UsageDashboard({ usage }: { usage: Record<string, number> }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
        <h4 className="text-sm font-medium text-slate-500">Users Consumed</h4>
        <p className="text-3xl font-bold text-slate-900 mt-2">{usage['USER'] || 0}</p>
      </div>
      <div className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
        <h4 className="text-sm font-medium text-slate-500">Camera Usage</h4>
        <p className="text-3xl font-bold text-slate-900 mt-2">{usage['CAMERA'] || 0}</p>
      </div>
      <div className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
        <h4 className="text-sm font-medium text-slate-500">Storage (GB)</h4>
        <p className="text-3xl font-bold text-slate-900 mt-2">{usage['STORAGE'] || 0}</p>
      </div>
      <div className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
        <h4 className="text-sm font-medium text-slate-500">AI Requests</h4>
        <p className="text-3xl font-bold text-slate-900 mt-2">{usage['AI_REQUEST'] || 0}</p>
      </div>
    </div>
  );
}
