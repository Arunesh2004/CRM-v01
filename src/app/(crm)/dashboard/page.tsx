import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI Cards */}
        <div className="bg-white p-4 rounded shadow">Customers: 12</div>
        <div className="bg-white p-4 rounded shadow">Active Leads: 5</div>
        <div className="bg-white p-4 rounded shadow">Pending Tasks: 8</div>
        <div className="bg-white p-4 rounded shadow">Monthly Revenue: $0</div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<div>Loading activities...</div>}>
          <div className="bg-white p-4 rounded shadow h-64">Recent Activities</div>
        </Suspense>
        <Suspense fallback={<div>Loading tasks...</div>}>
          <div className="bg-white p-4 rounded shadow h-64">Task Summary</div>
        </Suspense>
      </div>
    </div>
  );
}
