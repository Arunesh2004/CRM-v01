import { Suspense } from 'react';
import { getCustomersAction } from '@/modules/crm/actions/customer.actions';
import { CustomerForm } from '@/components/crm/CustomerForm';
import Link from 'next/link';
import { CustomerActions } from '@/components/crm/CustomerActions';

export default async function CustomersPage() {
  const result = await getCustomersAction();
  const customers = result.success ? (result.data || []) : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Customers</h1>
        <CustomerForm />
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
                <th className="py-2">Industry</th>
                <th className="py-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    No customers found. Click "Add Customer" to get started.
                  </td>
                </tr>
              )}
              {customers.map((customer: any) => (
                <tr key={customer.id} className="border-b">
                  <td className="py-2">{customer.name}</td>
                  <td className="py-2">{customer.industry || '-'}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-sm ${customer.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="py-2">
                    <Link href={`/customers/${customer.id}`} className="text-blue-600 hover:underline">View</Link>
                    <CustomerActions customerId={customer.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Suspense>
      </div>
    </div>
  );
}
