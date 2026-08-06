'use client';

import { useEffect, useState } from 'react';
import { getNotificationsByIncidentAction } from '@/modules/communication/actions/notification.actions';

export function IncidentNotificationStatus({ incidentId }: { incidentId: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      const res = await getNotificationsByIncidentAction(incidentId);
      if (res.success) {
        setNotifications(res.data || []);
      }
      setLoading(false);
    };
    fetchNotifications();
  }, [incidentId]);

  if (loading) return <span className="text-xs text-gray-400">Loading...</span>;
  if (notifications.length === 0) return <span className="text-xs text-gray-400">None</span>;

  return (
    <div className="flex flex-col space-y-1">
      {notifications.map(n => {
        let channel = 'Unknown';
        if (n.title.includes('Email')) channel = 'Email';
        if (n.title.includes('SMS')) channel = 'SMS';
        if (n.title.includes('WhatsApp')) channel = 'WhatsApp';
        if (n.title.includes('Dashboard')) channel = 'Dashboard';
        
        let statusColor = 'text-gray-500';
        if (n.title.includes('SENT')) statusColor = 'text-green-600';
        if (n.title.includes('FAILED')) statusColor = 'text-red-600';

        return (
          <span key={n.id} className={`text-xs font-medium ${statusColor}`}>
            ✓ {channel} Sent
          </span>
        );
      })}
    </div>
  );
}
