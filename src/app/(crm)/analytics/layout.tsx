import { ReactNode } from 'react';

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full bg-white rounded-lg shadow overflow-hidden">
      {/* Analytics Sidebar Navigation */}
      <aside className="w-64 border-r bg-gray-50 flex flex-col">
        <div className="p-4 border-b font-semibold bg-blue-900 text-white">
          <span>Enterprise Analytics</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 text-sm font-medium">
          <a href="/analytics" className="block p-2 rounded hover:bg-gray-100 text-gray-700">Executive Summary</a>
          <a href="#crm" className="block p-2 rounded hover:bg-gray-100 text-gray-500 cursor-not-allowed">CRM Performance</a>
          <a href="#communication" className="block p-2 rounded hover:bg-gray-100 text-gray-500 cursor-not-allowed">Communication Metrics</a>
          <a href="#billing" className="block p-2 rounded hover:bg-gray-100 text-gray-500 cursor-not-allowed">Billing & Revenue</a>
          <a href="#usage" className="block p-2 rounded hover:bg-gray-100 text-gray-500 cursor-not-allowed">System Usage</a>
        </nav>
      </aside>
      
      {/* Analytics Content Panel */}
      <main className="flex-1 flex flex-col p-6 overflow-y-auto bg-gray-50/50">
        {children}
      </main>
    </div>
  );
}
