'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createLocationAction } from '@/modules/crm/actions/location.actions';
import { getCustomersAction } from '@/modules/crm/actions/customer.actions';

export function LocationForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      getCustomersAction().then((res) => {
        if (res.success) setCustomers(res.data || []);
      });
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      customerId: formData.get('customerId') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      country: formData.get('country') as string,
    };

    const res = await createLocationAction(data);
    
    setIsLoading(false);
    if (res.success) {
      setIsOpen(false);
      router.refresh();
    } else {
      setError(res.error || 'Failed to create location');
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Add Location
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md text-black">
            <h2 className="text-xl font-bold mb-4">Add New Location</h2>
            
            {error && <div className="bg-red-100 text-red-600 p-2 rounded mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Location Name *</label>
                <input required name="name" type="text" className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Customer *</label>
                <select required name="customerId" className="w-full border rounded p-2">
                  <option value="">Select a customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Address</label>
                <input name="address" type="text" className="w-full border rounded p-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">City</label>
                  <input name="city" type="text" className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">State</label>
                  <input name="state" type="text" className="w-full border rounded p-2" />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Country</label>
                <input name="country" type="text" className="w-full border rounded p-2" />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-gray-200 rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-400"
                >
                  {isLoading ? 'Saving...' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
