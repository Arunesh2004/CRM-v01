import { Suspense } from 'react';

export default function LeadsPage() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Leads Pipeline</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded">New Lead</button>
      </div>
      
      <div className="flex-1 overflow-x-auto">
        <Suspense fallback={<div>Loading Kanban board...</div>}>
          <div className="flex space-x-4 h-full pb-4 min-w-max">
            {/* Mock Kanban Columns */}
            <div className="w-80 bg-gray-50 rounded shadow flex flex-col">
              <div className="p-3 font-semibold border-b">New (2)</div>
              <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                <div className="bg-white p-3 rounded shadow-sm border border-gray-100">
                  <div className="font-medium">Tech Solutions Inc</div>
                  <div className="text-sm text-gray-500">$5,000</div>
                </div>
              </div>
            </div>

            <div className="w-80 bg-gray-50 rounded shadow flex flex-col">
              <div className="p-3 font-semibold border-b">Contacted (1)</div>
              <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                 <div className="bg-white p-3 rounded shadow-sm border border-gray-100">
                  <div className="font-medium">Global Corp</div>
                  <div className="text-sm text-gray-500">$12,000</div>
                </div>
              </div>
            </div>

            <div className="w-80 bg-gray-50 rounded shadow flex flex-col">
              <div className="p-3 font-semibold border-b">Qualified (0)</div>
              <div className="p-2 space-y-2 flex-1 overflow-y-auto">
              </div>
            </div>
            
             <div className="w-80 bg-gray-50 rounded shadow flex flex-col">
              <div className="p-3 font-semibold border-b">Converted (0)</div>
              <div className="p-2 space-y-2 flex-1 overflow-y-auto">
              </div>
            </div>
          </div>
        </Suspense>
      </div>
    </div>
  );
}
