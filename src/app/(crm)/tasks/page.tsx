import { Suspense } from 'react';

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Create Task</button>
      </div>
      
      <div className="bg-white rounded shadow p-4">
        <Suspense fallback={<div>Loading tasks...</div>}>
          <div className="space-y-4">
            {/* Mock Task List */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center space-x-3">
                <input type="checkbox" className="h-5 w-5 rounded border-gray-300" />
                <div>
                  <div className="font-medium">Call Acme Corp regarding renewal</div>
                  <div className="text-sm text-gray-500">Due: Today</div>
                </div>
              </div>
              <div>
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">High Priority</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center space-x-3">
                <input type="checkbox" className="h-5 w-5 rounded border-gray-300" />
                <div>
                  <div className="font-medium">Send contract to Global Corp</div>
                  <div className="text-sm text-gray-500">Due: Tomorrow</div>
                </div>
              </div>
              <div>
                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">Normal Priority</span>
              </div>
            </div>
          </div>
        </Suspense>
      </div>
    </div>
  );
}
