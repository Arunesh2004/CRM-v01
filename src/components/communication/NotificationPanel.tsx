'use client';
import { markNotificationReadAction } from '@/modules/communication/actions/notification.actions';

export default function NotificationPanel({ notifications }: { notifications: any[] }) {
  if (!notifications || notifications.length === 0) {
    return <div className="text-sm text-slate-500 p-4 border rounded-md">No new notifications.</div>;
  }

  const handleRead = async (id: string) => {
    await markNotificationReadAction({ notificationId: id });
    window.location.reload(); // Simple refresh for prototype
  };

  return (
    <div className="space-y-3">
      {notifications.map((notif) => (
        <div key={notif.id} className={`p-4 border rounded-lg ${notif.isRead ? 'bg-slate-50' : 'bg-blue-50 border-blue-100'}`}>
          <div className="flex justify-between">
            <h4 className="font-semibold text-slate-800 text-sm">{notif.title}</h4>
            {!notif.isRead && (
              <button onClick={() => handleRead(notif.id)} className="text-xs text-blue-600 hover:underline">Mark as read</button>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-1">{notif.body}</p>
          <span className="text-xs text-slate-400 block mt-2">{new Date(notif.createdAt).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
