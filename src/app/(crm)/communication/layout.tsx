import { ReactNode } from 'react';

export default function CommunicationLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full bg-white rounded-lg shadow overflow-hidden">
      {/* Communication Sidebar (Inbox Navigation) */}
      <aside className="w-72 border-r bg-gray-50 flex flex-col">
        <div className="p-4 border-b font-semibold flex justify-between items-center">
          <span>Unified Inbox</span>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">12 Unread</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* Mock Inbox List */}
          <a href="/communication/conv_1" className="block p-4 border-b hover:bg-gray-100 cursor-pointer">
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-sm">Acme Corp</span>
              <span className="text-xs text-gray-500">10:42 AM</span>
            </div>
            <div className="text-xs text-gray-600 truncate flex items-center space-x-1">
              <span className="bg-green-100 text-green-800 px-1 rounded">WhatsApp</span>
              <span>Can we schedule a call?</span>
            </div>
          </a>
          
          <a href="/communication/conv_2" className="block p-4 border-b hover:bg-gray-100 cursor-pointer bg-blue-50">
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-sm font-bold">Global Industries</span>
              <span className="text-xs text-blue-600 font-bold">Yesterday</span>
            </div>
            <div className="text-xs text-gray-600 truncate flex items-center space-x-1">
              <span className="bg-gray-200 text-gray-800 px-1 rounded">Email</span>
              <span className="font-medium text-gray-900">Signed Contract Attached</span>
            </div>
          </a>
        </div>
      </aside>
      
      {/* Conversation Panel / Children */}
      <main className="flex-1 flex flex-col relative">
        {children}
      </main>
      
      {/* Customer Context Panel */}
      <aside className="w-64 border-l bg-gray-50 p-4 hidden lg:block">
        <h3 className="font-semibold mb-4 text-sm uppercase text-gray-500">Customer Context</h3>
        <div className="bg-white p-3 rounded border shadow-sm space-y-2">
           <div className="text-sm font-medium">Global Industries</div>
           <div className="text-xs text-gray-500">Plan: Enterprise</div>
           <div className="text-xs text-gray-500">Status: Active</div>
        </div>
      </aside>
    </div>
  );
}
