'use client';
import { useState } from 'react';

export default function TaskBoard({ initialTasks, canCreate }: { initialTasks: any[], canCreate: boolean }) {
  const [tasks, setTasks] = useState(initialTasks);

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
        <h3 className="text-lg font-medium text-slate-900">No tasks found</h3>
        <p className="text-sm text-slate-500 mt-1">Get started by creating a task.</p>
        {canCreate && <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Create Task</button>}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {['PENDING', 'IN_PROGRESS', 'COMPLETED'].map(status => (
        <div key={status} className="bg-slate-100 p-4 rounded-lg">
          <h3 className="font-semibold text-slate-700 mb-4 uppercase text-sm tracking-wider">{status.replace('_', ' ')}</h3>
          <div className="space-y-4">
            {tasks.filter(t => t.status === status).map((task: any) => (
              <div key={task.id} className="bg-white p-4 rounded shadow-sm border border-slate-200 cursor-pointer hover:border-blue-400 transition">
                <h4 className="font-medium text-slate-900">{task.title}</h4>
                {task.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{task.description}</p>}
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-xs text-slate-400">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
