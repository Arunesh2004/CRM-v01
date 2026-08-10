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
    <div className="space-y-6 max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold">Notification Center</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No notifications yet.
            </div>
          ) : (
            notifications.map(notif => (
              <div key={notif.id} className={`p-4 flex items-start space-x-4 hover:bg-gray-50 cursor-pointer ${notif.isRead ? 'opacity-75' : ''}`}>
                <div className="mt-1">
                  <span className="bg-blue-100 text-blue-600 p-2 rounded-full inline-block">
                    {notif.type === 'ALERT' ? '🔔' : notif.type === 'REMINDER' ? '⏰' : 'ℹ️'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-gray-900 text-sm">{notif.title}</h4>
                    <span className="text-xs text-gray-500">{formatDistanceToNow(notif.createdAt, { addSuffix: true })}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notif.body}</p>
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
