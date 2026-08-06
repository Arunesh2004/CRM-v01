'use client';

export function CommunicationHistoryTable({ notifications }: { notifications: any[] }) {
  const getChannelBadge = (type: string) => {
    const map: any = {
      EMAIL: 'bg-blue-100 text-blue-800',
      SYSTEM: 'bg-gray-100 text-gray-800',
    };
    
    // Attempt to guess SMS / WhatsApp from title if they are grouped under SYSTEM
    let displayType = type;
    if (type === 'SYSTEM') {
      displayType = 'SYSTEM';
    }
    
    return <span className={`px-2 py-1 rounded text-xs font-bold ${map[type] || 'bg-gray-100 text-gray-800'}`}>{displayType}</span>;
  };

  const getStatusBadge = (title: string) => {
    let status = 'UNKNOWN';
    if (title.includes('SENT')) status = 'SENT';
    if (title.includes('FAILED')) status = 'FAILED';
    if (title.includes('DELIVERED')) status = 'DELIVERED';

    const map: any = {
      SENT: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      DELIVERED: 'bg-blue-100 text-blue-800',
      UNKNOWN: 'bg-gray-100 text-gray-800',
    };

    return <span className={`px-2 py-1 rounded text-xs font-bold ${map[status] || map.UNKNOWN}`}>{status}</span>;
  };

  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded shadow p-12 text-center text-gray-500">
        <h3 className="text-lg font-bold mb-2">No communication history</h3>
        <p>There are no outbound notifications recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded shadow overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-50">
          <tr className="border-b">
            <th className="py-3 px-4">Type</th>
            <th className="py-3 px-4">Title / Channel</th>
            <th className="py-3 px-4">Message Body</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Recipient (Trigger)</th>
            <th className="py-3 px-4">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {notifications.map((notification: any) => (
            <tr key={notification.id} className="border-b hover:bg-gray-50">
              <td className="py-3 px-4">{getChannelBadge(notification.type)}</td>
              <td className="py-3 px-4 font-medium">{notification.title}</td>
              <td className="py-3 px-4 text-sm text-gray-600 truncate max-w-xs">{notification.body}</td>
              <td className="py-3 px-4">{getStatusBadge(notification.title)}</td>
              <td className="py-3 px-4 text-sm">{notification.user?.email || 'System'}</td>
              <td className="py-3 px-4 text-sm text-gray-500">{new Date(notification.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
