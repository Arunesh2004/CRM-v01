import { Suspense } from 'react';

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Customers</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Add Customer</button>
      </div>
      
      <div className="bg-white rounded shadow p-4">
        <div className="mb-4">
          <input type="text" placeholder="Search customers..." className="border rounded p-2 w-full max-w-md" />
        </div>
        <Suspense fallback={<div>Loading customer list...</div>}>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Mock Data */}
              <tr className="border-b">
                <td className="py-2">Acme Corp</td>
                <td className="py-2">contact@acme.com</td>
                <td className="py-2"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Active</span></td>
                <td className="py-2"><button className="text-blue-600">View</button></td>
              </tr>
            </tbody>
          </table>
        </Suspense>
      </div>
    </div>
  );
}
