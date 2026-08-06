'use client';
import { useState } from 'react';

export default function CustomerTable({ initialCustomers, canCreate }: { initialCustomers: any[], canCreate: boolean }) {
  const [customers, setCustomers] = useState(initialCustomers);

  if (!customers || customers.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
        <h3 className="text-lg font-medium text-slate-900">No customers found</h3>
        <p className="text-sm text-slate-500 mt-1">Convert a lead to create a customer.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Industry</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {customers.map((customer: any) => (
            <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{customer.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{customer.industry || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">{customer.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
