export default function PermissionsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold">Roles & Permissions</h1>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b">
           <h3 className="font-semibold text-gray-900 mb-2">Member Role</h3>
           <p className="text-sm text-gray-500 mb-4">Standard users who can interact with CRM data but cannot modify billing or workspace settings.</p>
           
           <div className="space-y-2 text-sm">
             <div className="flex items-center space-x-3">
               <input type="checkbox" checked disabled className="rounded text-blue-600" />
               <span className="text-gray-700">View Customers</span>
             </div>
             <div className="flex items-center space-x-3">
               <input type="checkbox" checked disabled className="rounded text-blue-600" />
               <span className="text-gray-700">Manage Leads</span>
             </div>
             <div className="flex items-center space-x-3">
               <input type="checkbox" disabled className="rounded text-blue-600" />
               <span className="text-gray-700">Delete Customers (Restricted to Admin)</span>
             </div>
             <div className="flex items-center space-x-3">
               <input type="checkbox" disabled className="rounded text-blue-600" />
               <span className="text-gray-700">Manage Subscription (Restricted to Admin)</span>
             </div>
           </div>
        </div>

        <div className="p-6 bg-gray-50">
           <h3 className="font-semibold text-gray-900 mb-2">Admin Role</h3>
           <p className="text-sm text-gray-500 mb-4">Full access to all CRM functions, billing, and workspace configuration.</p>
           <div className="text-sm text-gray-700 italic">Admin permissions cannot be modified.</div>
        </div>
      </div>
    </div>
  );
}
