import { ReactNode } from 'react';

export default function CRMLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white border-r">
        <div className="p-4 font-bold text-lg border-b">SaaS CRM</div>
        <nav className="p-4 space-y-2">
          <a href="/dashboard" className="block p-2 rounded hover:bg-gray-50">Dashboard</a>
          <a href="/customers" className="block p-2 rounded hover:bg-gray-50">Customers</a>
          <a href="/leads" className="block p-2 rounded hover:bg-gray-50">Leads</a>
          <a href="/tasks" className="block p-2 rounded hover:bg-gray-50">Tasks</a>
        </nav>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6">
          <div className="font-semibold text-gray-700">Workspace</div>
          <div>User Menu</div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
