'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTaskAction } from '@/modules/crm/actions/task.actions';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Loader2, X, Plus } from 'lucide-react';

export function TaskForm({ users, defaultCustomerId, defaultLeadId }: { users: any[], defaultCustomerId?: string, defaultLeadId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const dueDateVal = formData.get('dueDate') as string;
    
    const data: any = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      priority: formData.get('priority') as string,
    };
    
    if (dueDateVal) data.dueDate = new Date(dueDateVal);
    
    const assignedUserId = formData.get('assignedUserId') as string;
    if (assignedUserId) data.assignedUserId = assignedUserId;

    if (defaultCustomerId) data.customerId = defaultCustomerId;
    if (defaultLeadId) data.leadId = defaultLeadId;

    const res = await createTaskAction(data);
    
    setIsLoading(false);
    if (res.success) {
      setIsOpen(false);
      toast.success('Task created successfully');
      router.refresh();
    } else {
      setError(res.error || 'Failed to create task');
      toast.error(res.error || 'Failed to create task');
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        New Task
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          />
          
          <div 
            className="relative z-50 w-full max-w-lg rounded-[1.25rem] border border-white/[.08] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            style={{
              background: 'linear-gradient(180deg, rgba(20,27,51,.95), rgba(7,11,24,.95))',
              boxShadow: '0 32px 80px rgba(0,0,0,.7)'
            }}
          >
            <div className="px-6 py-5 border-b border-white/[.06] flex items-center justify-between" style={{ background: 'rgba(13,19,38,.6)' }}>
              <div>
                <h2 className="text-xl font-display font-bold text-white tracking-tight">Create Task</h2>
                <p className="text-sm text-[#8891B0] mt-1">Schedule a new follow-up or to-do.</p>
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

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Task Title <span className="text-rose-400">*</span></label>
                <input 
                  required 
                  name="title" 
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
                  placeholder="e.g. Call client to discuss renewal"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Due Date</label>
                  <input 
                    name="dueDate" 
                    type="date" 
                    className="w-full text-sm transition-all focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent"
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
                  <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Priority</label>
                  <select 
                    name="priority"
                    defaultValue="MEDIUM"
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
                    <option value="LOW" className="bg-[#0D1326]">Low</option>
                    <option value="MEDIUM" className="bg-[#0D1326]">Medium</option>
                    <option value="HIGH" className="bg-[#0D1326]">High</option>
                    <option value="URGENT" className="bg-[#0D1326]">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Assign To</label>
                <select 
                  name="assignedUserId"
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
                  <option value="" className="bg-[#0D1326]">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id} className="bg-[#0D1326]">{u.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Description</label>
                <textarea 
                  name="description" 
                  rows={3}
                  className="w-full text-sm transition-all placeholder:text-[#8891B0] focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent resize-none"
                  style={{
                    background: 'rgba(20,27,51,.55)',
                    border: '1px solid rgba(255,255,255,.08)',
                    borderRadius: '.7rem',
                    padding: '.6rem 1rem',
                    color: '#E7EAF5',
                    outline: 'none',
                  }}
                  placeholder="Task details..."
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
                  {isLoading ? 'Creating...' : 'Create Task'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
