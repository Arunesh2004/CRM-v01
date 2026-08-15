'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLeadAction } from '@/modules/crm/actions/lead.actions';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Loader2, X } from 'lucide-react';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div 
            className="relative z-50 w-full max-w-lg rounded-[1.25rem] border border-white/[.08] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            style={{
              background: 'linear-gradient(180deg, rgba(20,27,51,.95), rgba(7,11,24,.95))',
              boxShadow: '0 32px 80px rgba(0,0,0,.7)'
            }}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/[.06] flex items-center justify-between" style={{ background: 'rgba(13,19,38,.6)' }}>
              <div>
                <h2 className="text-xl font-display font-bold text-white tracking-tight">Create New Lead</h2>
                <p className="text-sm text-[#8891B0] mt-1">Add a new prospect to your pipeline.</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-[#8891B0] hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {error && (
              <div className="px-6 pt-4">
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-sm flex items-center gap-2">
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Contact Name <span className="text-rose-400">*</span></label>
                  <input 
                    required 
                    name="name" 
                    type="text" 
                    className="w-full text-sm transition-all placeholder:text-[#8891B0] focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent"
                    style={{
                      background: 'rgba(20,27,51,.55)',
                      border: '1px solid rgba(255,255,255,.08)',
                      borderRadius: '.7rem',
                      padding: '.6rem 1rem',
                      color: '#E7EAF5',
                      outline: 'none',
                    }}
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Company Name <span className="text-rose-400">*</span></label>
                  <input 
                    required 
                    name="company" 
                    type="text" 
                    className="w-full text-sm transition-all placeholder:text-[#8891B0] focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent"
                    style={{
                      background: 'rgba(20,27,51,.55)',
                      border: '1px solid rgba(255,255,255,.08)',
                      borderRadius: '.7rem',
                      padding: '.6rem 1rem',
                      color: '#E7EAF5',
                      outline: 'none',
                    }}
                    placeholder="Acme Corp"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Email</label>
                  <input 
                    name="email" 
                    type="email" 
                    className="w-full text-sm transition-all placeholder:text-[#8891B0] focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent"
                    style={{
                      background: 'rgba(20,27,51,.55)',
                      border: '1px solid rgba(255,255,255,.08)',
                      borderRadius: '.7rem',
                      padding: '.6rem 1rem',
                      color: '#E7EAF5',
                      outline: 'none',
                    }}
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Phone</label>
                  <input 
                    name="phone" 
                    type="tel" 
                    className="w-full text-sm transition-all placeholder:text-[#8891B0] focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent"
                    style={{
                      background: 'rgba(20,27,51,.55)',
                      border: '1px solid rgba(255,255,255,.08)',
                      borderRadius: '.7rem',
                      padding: '.6rem 1rem',
                      color: '#E7EAF5',
                      outline: 'none',
                    }}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-white/[.06] mt-6">
                <Button 
                  type="button" 
                  variant="ghost"
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
