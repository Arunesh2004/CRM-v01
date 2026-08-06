'use client';

export function UsageCard({ usage }: { usage: any }) {
  if (!usage) return null;

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">Current Usage</h2>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Cameras</span>
            <span>{usage.cameras.used} / {usage.cameras.limit || 'Unlimited'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: usage.cameras.limit ? `${Math.min(100, (usage.cameras.used / usage.cameras.limit) * 100)}%` : '10%' }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Users</span>
            <span>{usage.users.used} / {usage.users.limit || 'Unlimited'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full" 
              style={{ width: usage.users.limit ? `${Math.min(100, (usage.users.used / usage.users.limit) * 100)}%` : '10%' }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
