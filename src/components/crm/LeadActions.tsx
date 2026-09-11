'use client';
import { Pipeline, PipelineStage } from '@prisma/client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { assignLeadAction, convertLeadAction, deleteLeadAction } from '@/modules/crm/actions/lead.actions';
import { convertLeadToDealAction } from '@/modules/crm/actions/deal.actions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Loader2, X } from 'lucide-react';

export function LeadActions({
  leadId,
  users,
  pipelines = []
}: {
  leadId: string;
  users: { id: string; email: string }[];
  pipelines?: (Pipeline & { stages: PipelineStage[] })[];
}) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [isConvertingDeal, setIsConvertingDeal] = useState(false);
  const [dealValue, setDealValue] = useState(0);

  const [selectedPipeline, setSelectedPipeline] = useState(pipelines[0]?.id || '');
  const router = useRouter();

  const handleAssign = async () => {
    if (!selectedUserId) return;
    setIsSaving(true);
    const res = await assignLeadAction(leadId, selectedUserId);
    setIsSaving(false);
    if (res.success) {
      toast.success('Lead assigned successfully');
      setIsAssigning(false);
      router.refresh();
    } else {
      toast.error('Error assigning lead: ' + res.error);
    }
  };

  const handleConvert = async () => {
    const res = await convertLeadAction(leadId);
    if (res.success) {
      toast.success('Lead converted to customer successfully');
      router.refresh();
    } else {
      toast.error('Error converting lead: ' + res.error);
    }
  };

  const handleDelete = async () => {
    const res = await deleteLeadAction(leadId);
    if (res.success) {
      toast.success('Lead deleted successfully');
      router.refresh();
    } else {
      toast.error('Error deleting lead: ' + res.error);
    }
  };

  const handleConvertDealSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const value = parseFloat(formData.get('value') as string) || 0;
    const assignee = formData.get('assignedUserId') as string;
    const stageId = formData.get('stageId') as string;

    const res = await convertLeadToDealAction(leadId, assignee, value, selectedPipeline, stageId);
    setIsSaving(false);

    if (res.success) {
      toast.success('Lead converted to deal successfully');
      setIsConvertingDeal(false);
      router.push('/deals');
    } else {
      toast.error('Error converting lead to deal: ' + res.error);
    }
  };

  const currentPipeline = pipelines.find(p => p.id === selectedPipeline) || pipelines[0];
  const stages = currentPipeline?.stages || [];

  return (
    <div className="flex flex-col space-y-2 mt-3 pt-3 border-t border-muted/50 text-xs">
      <div className="flex space-x-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAssigning(!isAssigning)}
          className="text-[10px] h-6 px-2"
        >
          Assign
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsConvertingDeal(true)}
          className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 text-[10px] h-6 px-2"
        >
          Convert to Deal
        </Button>
        <ConfirmDialog
          title="Convert to Customer"
          description="Are you sure you want to convert this lead to a customer? This will generate a new customer profile."
          confirmText="Convert"
          variant="default"
          onConfirm={handleConvert}
          trigger={
            <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50 text-[10px] h-6 px-2">
              To Customer
            </Button>
          }
        />
        <ConfirmDialog
          title="Delete Lead"
          description="Are you sure you want to delete this lead? This action cannot be undone."
          confirmText="Delete"
          onConfirm={handleDelete}
          trigger={
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 text-[10px] h-6 px-2">
              Delete
            </Button>
          }
        />
      </div>

      {isAssigning && (
        <div className="flex space-x-2 mt-2">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="border border-border bg-background rounded px-1 py-1 flex-1 text-foreground"
          >
            <option value="">Select User...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.email}</option>
            ))}
          </select>
          <Button size="sm" className="h-6 text-[10px]" onClick={handleAssign} disabled={isSaving}>
            {isSaving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            Save
          </Button>
        </div>
      )}

      {isConvertingDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 animate-in fade-in duration-200 text-base">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => !isSaving && setIsConvertingDeal(false)}
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
                <h2 className="text-xl font-display font-bold text-white tracking-tight">Convert to Deal</h2>
                <p className="text-sm text-[#8891B0] mt-1">Convert this lead directly to a new pipeline opportunity.</p>
              </div>
              <button
                onClick={() => !isSaving && setIsConvertingDeal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-[#8891B0] hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConvertDealSubmit} className="p-6 space-y-5 text-left">
              <div>
                <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Value ($) <span className="text-rose-400">*</span></label>
                <input
                  required
                  name="value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={dealValue}
                  onChange={(e) => setDealValue(parseFloat(e.target.value))}
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
                    {stages.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#0D1326]">{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Assignee <span className="text-rose-400">*</span></label>
                <select
                  required
                  name="assignedUserId"
                  className="w-full text-sm transition-all focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent text-white"
                  style={{
                    background: 'rgba(20,27,51,.55)',
                    border: '1px solid rgba(255,255,255,.08)',
                    borderRadius: '.7rem',
                    padding: '.6rem 1rem',
                  }}
                >
                  <option value="" disabled selected>Select assignee</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id} className="bg-[#0D1326]">
                      {user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-white/[.06] mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsConvertingDeal(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSaving ? 'Converting...' : 'Convert'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
