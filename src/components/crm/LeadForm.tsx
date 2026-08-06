'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLeadAction } from '@/modules/crm/actions/lead.actions';

export function LeadForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      company: formData.get('company') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
    };

    const res = await createLeadAction(data);
    
    setIsLoading(false);
    if (res.success) {
      setIsOpen(false);
      router.refresh();
    } else {
      setError(res.error || 'Failed to create lead');
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        New Lead
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md text-black">
            <h2 className="text-xl font-bold mb-4">Create New Lead</h2>
            
            {error && <div className="bg-red-100 text-red-600 p-2 rounded mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Contact Name *</label>
                <input required name="name" type="text" className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Company Name *</label>
                <input required name="company" type="text" className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Email</label>
                <input name="email" type="email" className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Phone</label>
                <input name="phone" type="tel" className="w-full border rounded p-2" />
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
                  {isLoading ? 'Saving...' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
