import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getCustomerByIdAction } from '@/modules/crm/actions/customer.actions';

export default async function CustomerDetailsPage({ params }: { params: { id: string } }) {
  const result = await getCustomerByIdAction(params.id);
  
  if (!result.success || !result.data) {
    notFound();
  }

  const customer = result.data;
  const locations = customer.locations || [];
  const contacts = customer.contacts || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold">{customer.name}</h1>
          <p className="text-gray-500">{customer.industry || 'No industry specified'} | Status: {customer.status}</p>
        </div>
        <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded shadow-sm hover:bg-gray-200">
          Edit Customer
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Locations Section */}
          <div className="bg-white rounded shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Locations ({locations.length})</h2>
            </div>
            {locations.length === 0 ? (
              <p className="text-gray-500 text-sm">No locations found for this customer.</p>
            ) : (
              <ul className="space-y-3">
                {locations.map((loc: any) => (
                  <li key={loc.id} className="border p-3 rounded bg-gray-50 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{loc.name}</div>
                      <div className="text-sm text-gray-500">
                        {loc.address ? `${loc.address}, ` : ''}{loc.city ? `${loc.city}, ` : ''}{loc.country || ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Contacts Section */}
          <div className="bg-white rounded shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Contacts ({contacts.length})</h2>
            {contacts.length === 0 ? (
              <p className="text-gray-500 text-sm">No contacts found for this customer.</p>
            ) : (
              <ul className="space-y-3">
                {contacts.map((contact: any) => (
                  <li key={contact.id} className="border p-3 rounded flex justify-between items-center">
                    <div>
                      <div className="font-medium">{contact.firstName} {contact.lastName} {contact.isPrimary && <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded ml-1">Primary</span>}</div>
                      <div className="text-sm text-gray-500">{contact.email} | {contact.phone}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Timeline Section Placeholder */}
          <div className="bg-white rounded shadow p-4 h-96 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Activity Timeline</h2>
            <div className="text-gray-500 text-sm">Activity events will appear here...</div>
          </div>
        </div>
      </div>
    </div>
  );
}
