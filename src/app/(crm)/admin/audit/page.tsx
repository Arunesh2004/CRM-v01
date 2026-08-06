export default function AuditPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <div className="flex space-x-2">
           <select className="border p-2 rounded text-sm bg-white text-gray-700">
             <option>All Modules</option>
             <option>Billing</option>
             <option>Authentication</option>
             <option>CRM</option>
           </select>
           <button className="bg-white border px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 text-gray-700">Export CSV</button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 text-sm border-b">
            <tr>
              <th className="py-3 px-6 font-medium">Timestamp</th>
              <th className="py-3 px-6 font-medium">Actor</th>
              <th className="py-3 px-6 font-medium">Action</th>
              <th className="py-3 px-6 font-medium">Resource</th>
              <th className="py-3 px-6 font-medium">IP Address</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-800 divide-y font-mono">
            {/* Mock Data */}
            <tr className="hover:bg-gray-50">
              <td className="py-3 px-6">2026-08-06 14:02:11 UTC</td>
              <td className="py-3 px-6">alice@acme.com</td>
              <td className="py-3 px-6 text-green-600">USER_INVITED</td>
              <td className="py-3 px-6">bob@acme.com</td>
              <td className="py-3 px-6 text-gray-500">192.168.1.42</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="py-3 px-6">2026-08-06 12:45:00 UTC</td>
              <td className="py-3 px-6">System (Worker)</td>
              <td className="py-3 px-6 text-blue-600">INVOICE_GENERATED</td>
              <td className="py-3 px-6">inv_987654321</td>
              <td className="py-3 px-6 text-gray-500">-</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="py-3 px-6">2026-08-05 09:12:33 UTC</td>
              <td className="py-3 px-6">alice@acme.com</td>
              <td className="py-3 px-6 text-red-600">SETTINGS_MODIFIED</td>
              <td className="py-3 px-6">Require 2FA</td>
              <td className="py-3 px-6 text-gray-500">192.168.1.42</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
