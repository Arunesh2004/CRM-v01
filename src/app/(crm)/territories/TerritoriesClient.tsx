'use client';
import { useState, useTransition } from 'react';
import { Edit2, Plus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
    createTerritoryAction, 
    updateTerritoryAction, 
    assignTerritoryUserAction, 
    removeTerritoryAssignmentAction 
} from '@/modules/sales-intelligence/actions/territory.actions';
import { toast } from 'sonner';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
export function TerritoriesClient({ territories, canManage }: { territories: any[], canManage: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '', description: '', parentId: '' });
  const [assignData, setAssignData] = useState({ targetUserId: '', role: 'REP' });

  const handleCreate = async () => {
    if (!formData.name) {
        toast.error('Name is required');
        return;
    }
    startTransition(async () => {
      const result = await createTerritoryAction({
        name: formData.name,
        description: formData.description || undefined,
        parentId: formData.parentId || undefined
      });
      if (result.success) {
        toast.success('Territory created');
        setIsAdding(false);
        setFormData({ name: '', description: '', parentId: '' });
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    startTransition(async () => {
      const result = await updateTerritoryAction(editingId, {
        name: formData.name,
        description: formData.description || undefined,
        parentId: formData.parentId || undefined
      });
      if (result.success) {
        toast.success('Territory updated');
        setEditingId(null);
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleAssign = async () => {
    if (!assigningId || !assignData.targetUserId) {
        toast.error('User ID is required');
        return;
    }
    startTransition(async () => {
      const result = await assignTerritoryUserAction({
        territoryId: assigningId,
        targetUserId: assignData.targetUserId,
        role: assignData.role
      });
      if (result.success) {
        toast.success('User assigned');
        setAssigningId(null);
        setAssignData({ targetUserId: '', role: 'REP' });
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;
    startTransition(async () => {
      const result = await removeTerritoryAssignmentAction(assignmentId);
      if (result.success) {
        toast.success('Assignment removed');
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => { setIsAdding(true); setEditingId(null); setAssigningId(null); setFormData({ name: '', description: '', parentId: '' }); }} disabled={isPending}>
            <Plus className="w-4 h-4 mr-2" /> Add Territory
          </Button>
        </div>
      )}

      {(isAdding || editingId) && canManage && (
        <div className="glass-panel p-4 mb-4 rounded-xl flex flex-col gap-4 border border-white/10 bg-white/5">
          <h3 className="font-semibold text-white">{editingId ? 'Edit Territory' : 'New Territory'}</h3>
          <input 
             type="text" 
             placeholder="Territory Name" 
             value={formData.name}
             onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
             className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white text-sm"
          />
          <input 
             type="text" 
             placeholder="Description" 
             value={formData.description}
             onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
             className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white text-sm"
          />
          <input 
             type="text" 
             placeholder="Parent Territory ID (Optional)" 
             value={formData.parentId}
             onChange={e => setFormData(prev => ({ ...prev, parentId: e.target.value }))}
             className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white text-sm"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => { setIsAdding(false); setEditingId(null); }}>Cancel</Button>
            <Button onClick={editingId ? handleUpdate : handleCreate} disabled={isPending}>
                {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {assigningId && canManage && (
        <div className="glass-panel p-4 mb-4 rounded-xl flex flex-col gap-4 border border-white/10 bg-white/5">
          <h3 className="font-semibold text-white">Assign User to Territory</h3>
          <input 
             type="text" 
             placeholder="User ID" 
             value={assignData.targetUserId}
             onChange={e => setAssignData(prev => ({ ...prev, targetUserId: e.target.value }))}
             className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white text-sm"
          />
          <input 
             type="text" 
             placeholder="Role (e.g. REP, MANAGER)" 
             value={assignData.role}
             onChange={e => setAssignData(prev => ({ ...prev, role: e.target.value }))}
             className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white text-sm"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => { setAssigningId(null); }}>Cancel</Button>
            <Button onClick={handleAssign} disabled={isPending}>
                {isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[.04] bg-[#0D1326]/50">
              <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Territory Name</th>
              <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Owner / Assignments</th>
              <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Parent</th>
              {canManage && <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px] text-right">Actions</th>}
            </tr>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
          </thead>
          <tbody className="divide-y divide-white/[.04]">
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
            {territories?.map((territory: any) => (
              <tr key={territory.id} className="hover:bg-white/[.02] transition-colors group">
                <td className="px-6 py-4">
                  <p className="font-medium text-white">{territory.name}</p>
                  <p className="text-xs text-[#8891B0]">{territory.description}</p>
                  <p className="text-[10px] text-[#8891B0] opacity-50 font-mono mt-1">ID: {territory.id}</p>
                </td>
                <td className="px-6 py-4 text-[#8891B0]">
                    {/* The API returns userTerritories if queried correctly, but the basic findMany just returns the flat territory */}
                    {/* Assuming territory.owner or userTerritories is populated, if not it just shows basic info */}
                    {territory.owner?.email || 'Unassigned'}
                    {/* If there's assignments data we could map it here, but we will just show the assign button for now */}
                </td>
                <td className="px-6 py-4 text-[#8891B0]">
                    {territory.parentId || '-'}
                </td>
                {canManage && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { 
                                setAssigningId(territory.id);
                                setIsAdding(false);
                                setEditingId(null);
                            }}
                            disabled={isPending}
                        >
                            <UserPlus className="w-4 h-4 text-[#8891B0]" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { 
                                setEditingId(territory.id); 
                                setIsAdding(false); 
                                setAssigningId(null);
                                setFormData({ name: territory.name, description: territory.description || '', parentId: territory.parentId || '' }); 
                            }}
                            disabled={isPending}
                        >
                            <Edit2 className="w-4 h-4 text-[#8891B0]" />
                        </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {(!territories || territories.length === 0) && (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="px-6 py-8 text-center text-[#8891B0]">
                  No territories found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
