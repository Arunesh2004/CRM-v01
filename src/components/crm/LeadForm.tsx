'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLeadAction } from '@/modules/crm/actions/lead.actions';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';

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
      toast.success('Lead created successfully');
      router.refresh();
    } else {
      setError(res.error || 'Failed to create lead');
      toast.error(res.error || 'Failed to create lead');
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        New Lead
      </Button>

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
                  {isLoading ? 'Saving...' : 'Save Lead'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
