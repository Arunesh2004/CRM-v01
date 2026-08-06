import { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  // In a real implementation: await requirePermission('ADMIN');
  return (
    <div className="flex h-full bg-white rounded-lg shadow overflow-hidden">
      {/* Admin Sidebar Navigation */}
      <aside className="w-64 border-r bg-gray-50 flex flex-col">
        <div className="p-4 border-b font-semibold bg-gray-900 text-white">
          <span>Enterprise Admin</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 text-sm font-medium">
          <a href="/admin" className="block p-2 rounded hover:bg-gray-100 text-gray-700">Settings Overview</a>
          <a href="/admin/users" className="block p-2 rounded hover:bg-gray-100 text-gray-700">Workspace Members</a>
          <a href="/admin/permissions" className="block p-2 rounded hover:bg-gray-100 text-gray-700">Roles & Permissions</a>
          <a href="/admin/integrations" className="block p-2 rounded hover:bg-gray-100 text-gray-700">Integrations</a>
          <a href="/admin/audit" className="block p-2 rounded hover:bg-gray-100 text-gray-700">Audit Logs</a>
        </nav>
      </aside>
      
      {/* Admin Content Panel */}
      <main className="flex-1 flex flex-col p-6 overflow-y-auto bg-gray-50/50">
        {children}
      </main>
    </div>
  );
}
