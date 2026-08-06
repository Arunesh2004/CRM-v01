import { ReactNode } from 'react';

export default function BillingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full bg-white rounded-lg shadow overflow-hidden">
      {/* Billing Sidebar Navigation */}
      <aside className="w-64 border-r bg-gray-50 flex flex-col">
        <div className="p-4 border-b font-semibold">
          <span>Billing & Usage</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 text-sm font-medium">
          <a href="/billing" className="block p-2 rounded hover:bg-gray-100 text-gray-700">Overview</a>
          <a href="/billing/plans" className="block p-2 rounded hover:bg-gray-100 text-gray-700">Upgrade Plan</a>
          <a href="/billing/subscription" className="block p-2 rounded hover:bg-gray-100 text-gray-700">Manage Subscription</a>
          <a href="/billing/usage" className="block p-2 rounded hover:bg-gray-100 text-gray-700">Usage Limits</a>
          <a href="/billing/invoices" className="block p-2 rounded hover:bg-gray-100 text-gray-700">Invoices & Receipts</a>
        </nav>
      </aside>
      
      {/* Billing Content Panel */}
      <main className="flex-1 flex flex-col p-6 overflow-y-auto bg-gray-50/50">
        {children}
      </main>
    </div>
  );
}
