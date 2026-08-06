export default function BillingDashboardPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Billing Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Current Plan</h2>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">Starter</span>
              <span className="text-sm text-gray-500">/ month</span>
            </div>
            <p className="mt-1 text-sm text-gray-500">Renews on August 24, 2026</p>
          </div>
          <div className="mt-6">
            <a href="/billing/plans" className="text-blue-600 hover:text-blue-800 text-sm font-medium">Upgrade Plan →</a>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
           <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Quick Usage Summary</h2>
           <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Team Members</span>
                  <span className="text-gray-500">2 / 5</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '40%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Storage</span>
                  <span className="text-gray-500">10GB / 50GB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                </div>
              </div>
           </div>
           <div className="mt-4">
            <a href="/billing/usage" className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Detailed Usage →</a>
          </div>
        </div>
      </div>
    </div>
  );
}
