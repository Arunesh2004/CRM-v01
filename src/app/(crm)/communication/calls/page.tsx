import React from 'react';

export default function CallsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Call Logs</h1>
      <div className="bg-white border rounded-lg p-6 shadow-sm min-h-[500px] flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-4">No recent calls found.</p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">Log New Call</button>
      </div>
    </div>
  );
}
