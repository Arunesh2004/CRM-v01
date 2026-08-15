import prisma from '@/../database/utils/prisma';
import { requireAuth, requireTenant } from '@/lib/auth';
import { formatDistanceToNow } from 'date-fns';

export default async function NotificationsPage() {
  const user = await requireAuth();
  const tenantId = await requireTenant();

  const notifications = await prisma.notification.findMany({
    where: { tenantId, userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-8 animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-center border-b border-white/[.08] pb-6">
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">Notification Center</h1>
      </div>

      <div className="glass-panel rounded-xl shadow-2xl border border-white/[.08] overflow-hidden">
        <div className="divide-y divide-white/[.04]">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-[#8891B0]">
              <span className="block text-4xl mb-4 opacity-50">🔕</span>
              No notifications yet.
            </div>
          ) : (
            notifications.map(notif => (
              <div key={notif.id} className={`p-5 flex items-start space-x-4 hover:bg-white/[.02] transition-colors cursor-pointer ${notif.isRead ? 'opacity-60' : ''}`}>
                <div className="mt-1">
                  <span className="bg-violet-500/10 text-violet-400 border border-violet-500/20 p-2.5 rounded-lg inline-block">
                    {notif.type === 'ALERT' ? '🔔' : notif.type === 'REMINDER' ? '⏰' : 'ℹ️'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-white text-sm">{notif.title}</h4>
                    <span className="text-[10px] uppercase tracking-wider text-[#8891B0] font-bold">{formatDistanceToNow(notif.createdAt, { addSuffix: true })}</span>
                  </div>
                  <p className="text-sm text-[#8891B0] mt-1">{notif.body}</p>
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 bg-rose-500 rounded-full mt-2 shadow-[0_0_10px_rgba(244,63,94,0.8)]"></div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
