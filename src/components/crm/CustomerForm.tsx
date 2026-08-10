'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCustomerAction } from '@/modules/crm/actions/customer.actions';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';

export function CustomerForm() {
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
      industry: formData.get('industry') as string,
    };

    const res = await createCustomerAction(data);
    
    setIsLoading(false);
    if (res.success) {
      setIsOpen(false);
      toast.success('Customer created successfully');
      router.refresh();
    } else {
      setError(res.error || 'Failed to create customer');
      toast.error(res.error || 'Failed to create customer');
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Add Customer
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md text-black">
            <h2 className="text-xl font-bold mb-4">Add New Customer</h2>
            
            {error && <div className="bg-red-100 text-red-600 p-2 rounded mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Company Name *</label>
                <input required name="name" type="text" className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Industry</label>
                <input name="industry" type="text" className="w-full border rounded p-2" />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoading ? 'Saving...' : 'Save Customer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
