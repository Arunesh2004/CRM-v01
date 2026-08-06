import { Suspense } from 'react';
import { getLocationsAction } from '@/modules/crm/actions/location.actions';
import { LocationForm } from '@/components/crm/LocationForm';

export default async function LocationsPage() {
  const result = await getLocationsAction();
  const locations = result.success ? (result.data || []) : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Locations</h1>
        <LocationForm />
      </div>
      
      <div className="bg-white rounded shadow p-4">
        <div className="mb-4">
          <input type="text" placeholder="Search locations..." className="border rounded p-2 w-full max-w-md" />
        </div>
        <Suspense fallback={<div>Loading location list...</div>}>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2">Name</th>
                <th className="py-2">Customer</th>
                <th className="py-2">City</th>
                <th className="py-2">Cameras</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No locations found. Click "Add Location" to get started.
                  </td>
                </tr>
              )}
              {locations.map((location: any) => (
                <tr key={location.id} className="border-b">
                  <td className="py-2 font-medium">{location.name}</td>
                  <td className="py-2">{location.customer?.name || '-'}</td>
                  <td className="py-2">{location.city || '-'}</td>
                  <td className="py-2">0</td> {/* Future CCTV placeholder */}
                  <td className="py-2"><button className="text-blue-600">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Suspense>
      </div>
    </div>
  );
}
