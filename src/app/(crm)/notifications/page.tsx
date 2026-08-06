export default function NotificationsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold">Notification Center</h1>
        <div className="flex space-x-2">
           <button className="text-sm text-gray-500 hover:text-gray-900 border px-3 py-1.5 rounded">Mark all as read</button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
         <button className="bg-gray-900 text-white px-3 py-1 rounded-full text-sm font-medium">All</button>
         <button className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1 rounded-full text-sm">Unread</button>
         <button className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1 rounded-full text-sm">CRM</button>
         <button className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1 rounded-full text-sm">Communication</button>
         <button className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1 rounded-full text-sm">Billing</button>
         <button className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-full text-sm font-medium">Security Alerts</button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
         <div className="divide-y divide-gray-100">
            
            {/* Unread CRM Notification */}
            <div className="p-4 bg-blue-50/30 flex items-start space-x-4 hover:bg-gray-50 cursor-pointer">
               <div className="mt-1">
                 <span className="bg-blue-100 text-blue-600 p-2 rounded-full inline-block">👤</span>
               </div>
               <div className="flex-1">
                 <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-gray-900 text-sm">New Lead Assigned</h4>
                    <span className="text-xs text-gray-500">10m ago</span>
                 </div>
                 <p className="text-sm text-gray-600 mt-1">Bob Sales assigned <span className="font-medium">Tech Solutions Inc</span> to your pipeline.</p>
                 <div className="mt-2 text-xs font-semibold text-blue-600 uppercase tracking-wide">CRM</div>
               </div>
               <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
            </div>

            {/* Read Billing Notification */}
            <div className="p-4 flex items-start space-x-4 hover:bg-gray-50 cursor-pointer opacity-75">
               <div className="mt-1">
                 <span className="bg-green-100 text-green-600 p-2 rounded-full inline-block">💳</span>
               </div>
               <div className="flex-1">
                 <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-gray-900 text-sm">Invoice Paid</h4>
                    <span className="text-xs text-gray-500">Yesterday</span>
                 </div>
                 <p className="text-sm text-gray-600 mt-1">Payment of $99.00 for the Professional Plan was successful.</p>
                 <div className="mt-2 text-xs font-semibold text-green-600 uppercase tracking-wide">Billing</div>
               </div>
            </div>

            {/* Read Security Notification */}
            <div className="p-4 flex items-start space-x-4 hover:bg-gray-50 cursor-pointer">
               <div className="mt-1">
                 <span className="bg-red-100 text-red-600 p-2 rounded-full inline-block">🔒</span>
               </div>
               <div className="flex-1">
                 <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-gray-900 text-sm">New Device Login</h4>
                    <span className="text-xs text-gray-500">Aug 3, 2026</span>
                 </div>
                 <p className="text-sm text-gray-600 mt-1">We detected a new login from Chrome on Windows (IP: 192.168.1.42).</p>
                 <div className="mt-2 text-xs font-semibold text-red-600 uppercase tracking-wide">Security</div>
               </div>
            </div>

         </div>
      </div>
    </div>
  );
}
