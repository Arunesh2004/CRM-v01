'use client';
import { Deal, Pipeline, PipelineStage, User } from '@prisma/client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateDealAction } from '@/modules/crm/actions/deal.actions';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Loader2, X, PenSquare } from 'lucide-react';
import { format } from 'date-fns';

export function EditDealForm({ 
  deal, 
  pipelines, 
  assignableUsers = [] 
}: { 
  deal: Deal & { stage?: PipelineStage | null };
  pipelines: (Pipeline & { stages: PipelineStage[] })[];
  assignableUsers?: { id: string; email: string }[]; 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [selectedPipeline, setSelectedPipeline] = useState(deal.pipelineId || pipelines[0]?.id || '');
  const router = useRouter();

  const currentPipeline = pipelines.find(p => p.id === selectedPipeline) || pipelines[0];
  const stages = currentPipeline?.stages || [];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    
    const rawValue = formData.get('value') as string;
    const parsedValue = rawValue ? parseFloat(rawValue) : undefined;
    
    const rawDate = formData.get('expectedCloseDate') as string;
    const parsedDate = rawDate ? new Date(rawDate) : null;

    const data = {
      title: formData.get('title') as string,
      value: parsedValue,
      pipelineId: selectedPipeline,
      stageId: formData.get('stageId') as string,
      assignedUserId: formData.get('assignedUserId') as string,
      description: formData.get('description') as string,
      expectedCloseDate: parsedDate,
      source: formData.get('source') as string,
    };

      const res = await updateDealAction(deal.id, data);
    
    setIsLoading(false);
    if (res.success) {
      setIsOpen(false);
      toast.success('Deal updated successfully');
      router.refresh();
    } else {
      setError(res.error || 'Failed to update deal');
      toast.error(res.error || 'Failed to update deal');
    }
  }

  const expectedCloseDateVal = deal.expectedCloseDate ? format(new Date(deal.expectedCloseDate), 'yyyy-MM-dd') : '';

  return (
    <>
      <Button variant="ghost" className="bg-white/5 hover:bg-white/10" onClick={() => setIsOpen(true)}>
        <PenSquare className="w-4 h-4 mr-2" />
        Edit Deal
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          />
          
          <div 
            className="relative z-50 w-full max-w-lg rounded-[1.25rem] border border-white/[.08] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
            style={{
              background: 'linear-gradient(180deg, rgba(20,27,51,.95), rgba(7,11,24,.95))',
              boxShadow: '0 32px 80px rgba(0,0,0,.7)'
            }}
          >
            <div className="px-6 py-5 border-b border-white/[.06] flex items-center justify-between shrink-0" style={{ background: 'rgba(13,19,38,.6)' }}>
              <div>
                <h2 className="text-xl font-display font-bold text-white tracking-tight">Edit Deal</h2>
                <p className="text-sm text-[#8891B0] mt-1">Update deal opportunity details.</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-[#8891B0] hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {error && (
              <div className="px-6 pt-4 shrink-0">
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-sm flex items-center gap-2">
                  {error}
                </div>
              </div>
            )}

            <div className="overflow-y-auto">
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Deal Title <span className="text-rose-400">*</span></label>
                  <input 
                    required 
                    name="title" 
                    type="text" 
                                      defaultValue={deal.title}
                    className="w-full text-sm transition-all placeholder:text-[#8891B0] focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent"
                    style={{
                      background: 'rgba(20,27,51,.55)',
                      border: '1px solid rgba(255,255,255,.08)',
                      borderRadius: '.7rem',
                      padding: '.6rem 1rem',
                      color: '#E7EAF5',
                      outline: 'none',
                    }}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Value ($) <span className="text-rose-400">*</span></label>
                    <input 
                      required
                      name="value" 
                      type="number" 
                      min="0"
                      step="0.01"
                                          defaultValue={deal.value}
                      className="w-full text-sm transition-all placeholder:text-[#8891B0] focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent"
                      style={{
                        background: 'rgba(20,27,51,.55)',
                        border: '1px solid rgba(255,255,255,.08)',
                        borderRadius: '.7rem',
                        padding: '.6rem 1rem',
                        color: '#E7EAF5',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Expected Close</label>
                    <input 
                      name="expectedCloseDate" 
                      type="date"
                      defaultValue={expectedCloseDateVal}
                      className="w-full text-sm transition-all focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent"
                      style={{
                        background: 'rgba(20,27,51,.55)',
                        border: '1px solid rgba(255,255,255,.08)',
                        borderRadius: '.7rem',
                        padding: '.6rem 1rem',
                        color: '#E7EAF5',
                        outline: 'none',
                        colorScheme: 'dark'
                      }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Pipeline</label>
                    <select 
                      value={selectedPipeline}
                      onChange={(e) => setSelectedPipeline(e.target.value)}
                      className="w-full text-sm transition-all focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent"
                      style={{
                        background: 'rgba(20,27,51,.55)',
                        border: '1px solid rgba(255,255,255,.08)',
                        borderRadius: '.7rem',
                        padding: '.6rem 1rem',
                        color: '#E7EAF5',
                        outline: 'none',
                      }}
                    >
                      {pipelines.map((p) => (
                        <option key={p.id} value={p.id} className="bg-[#0D1326]">{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Stage</label>
                    <select 
                      name="stageId"
                                          defaultValue={deal.stageId}
                      className="w-full text-sm transition-all focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent"
                      style={{
                        background: 'rgba(20,27,51,.55)',
                        border: '1px solid rgba(255,255,255,.08)',
                        borderRadius: '.7rem',
                        padding: '.6rem 1rem',
                        color: '#E7EAF5',
                        outline: 'none',
                      }}
                    >
                      {stages.map((s: PipelineStage) => (
                        <option key={s.id} value={s.id} className="bg-[#0D1326]">{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Assignee <span className="text-rose-400">*</span></label>
                    <select 
                      required
                      name="assignedUserId"
                                          defaultValue={deal.assignedUserId || ''}
                      className="w-full text-sm transition-all focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent text-white"
                      style={{
                        background: 'rgba(20,27,51,.55)',
                        border: '1px solid rgba(255,255,255,.08)',
                        borderRadius: '.7rem',
                        padding: '.6rem 1rem',
                      }}
                    >
                      <option value="" disabled>Select assignee</option>
                      {assignableUsers.map((user) => (
                        <option key={user.id} value={user.id} className="bg-[#0D1326]">
                          {user.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Source</label>
                    <input 
                      name="source" 
                      type="text" 
                                          defaultValue={deal.source || ''}
                      className="w-full text-sm transition-all placeholder:text-[#8891B0] focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent"
                      style={{
                        background: 'rgba(20,27,51,.55)',
                        border: '1px solid rgba(255,255,255,.08)',
                        borderRadius: '.7rem',
                        padding: '.6rem 1rem',
                        color: '#E7EAF5',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Description</label>
                  <textarea 
                    name="description" 
                    rows={3}
                                      defaultValue={deal.description || ''}
                    className="w-full text-sm transition-all placeholder:text-[#8891B0] focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent resize-none"
                    style={{
                      background: 'rgba(20,27,51,.55)',
                      border: '1px solid rgba(255,255,255,.08)',
                      borderRadius: '.7rem',
                      padding: '.6rem 1rem',
                      color: '#E7EAF5',
                      outline: 'none',
                    }}
                  />
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
                    {isLoading ? 'Updating...' : 'Update Deal'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
