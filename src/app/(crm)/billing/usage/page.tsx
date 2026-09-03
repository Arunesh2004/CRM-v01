import { getUsageAction, getSubscriptionAction, getPlansAction } from '@/modules/billing/actions/billing.actions';
import { Card } from '@/components/ui/Card';
import { Activity, Users, HardDrive, Video } from 'lucide-react';
import { requireAuth } from '@/lib/auth';

export default async function BillingUsagePage() {
  await requireAuth();

  const [usageRes, subRes, plansRes] = await Promise.all([
    getUsageAction(),
    getSubscriptionAction(),
    getPlansAction()
  ]);

  const usage = usageRes.success ? usageRes.data! : { users: 0, storageBytes: 0, cameras: 0 };
  const subscription = subRes.success ? subRes.data : null;
  const plans = plansRes.success ? plansRes.data! : [];
  
  const currentPlan = plans?.find((p: any) => p.id === (subscription?.planId || 'FREE')) || plans?.[0];
  const limits = currentPlan?.limits || { users: 3, storageBytes: 1073741824, cameras: 0 };

  const userPercent = limits.users >= 999999 ? 0 : Math.min(100, Math.round((usage.users / limits.users) * 100));
  const storagePercent = Math.min(100, Math.round((usage.storageBytes / limits.storageBytes) * 100));
  const cameraPercent = limits.cameras >= 999999 ? 0 : (limits.cameras === 0 ? 100 : Math.min(100, Math.round((usage.cameras / limits.cameras) * 100)));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" /> Usage & Limits
          </p>
          <p className="text-sm mt-1 text-[#8891B0]">Track your resource consumption against your current {currentPlan?.name} plan limits.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="glass-panel overflow-hidden border-none shadow-none p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Users</h3>
          <p className="text-sm text-[#8891B0] mb-6">Team members in this workspace</p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white font-medium">{usage.users}</span>
              <span className="text-[#8891B0]">{limits.users >= 999999 ? 'Unlimited' : limits.users}</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${userPercent > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                style={{ width: `${limits.users >= 999999 ? 5 : userPercent}%` }}
              />
            </div>
            {userPercent > 90 && <p className="text-xs text-rose-400 mt-2">Nearing plan limit</p>}
          </div>
        </Card>

        <Card className="glass-panel overflow-hidden border-none shadow-none p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Storage</h3>
          <p className="text-sm text-[#8891B0] mb-6">Document and media storage</p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white font-medium">{(usage.storageBytes / (1024 * 1024 * 1024)).toFixed(2)} GB</span>
              <span className="text-[#8891B0]">{(limits.storageBytes / (1024 * 1024 * 1024)).toFixed(0)} GB</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${storagePercent > 90 ? 'bg-rose-500' : 'bg-blue-500'}`} 
                style={{ width: `${storagePercent}%` }}
              />
            </div>
             {storagePercent > 90 && <p className="text-xs text-rose-400 mt-2">Nearing plan limit</p>}
          </div>
        </Card>

        <Card className="glass-panel overflow-hidden border-none shadow-none p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Video className="w-5 h-5 text-violet-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Cameras</h3>
          <p className="text-sm text-[#8891B0] mb-6">Connected CCTV streams</p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white font-medium">{usage.cameras}</span>
              <span className="text-[#8891B0]">{limits.cameras >= 999999 ? 'Unlimited' : limits.cameras}</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${cameraPercent > 90 ? 'bg-rose-500' : 'bg-violet-500'}`} 
                style={{ width: `${limits.cameras >= 999999 ? 5 : cameraPercent}%` }}
              />
            </div>
             {limits.cameras === 0 ? (
                <p className="text-xs text-rose-400 mt-2">Cameras require PRO plan</p>
             ) : (
                cameraPercent > 90 && <p className="text-xs text-rose-400 mt-2">Nearing plan limit</p>
             )}
          </div>
        </Card>
      </div>
    </div>
  );
}
