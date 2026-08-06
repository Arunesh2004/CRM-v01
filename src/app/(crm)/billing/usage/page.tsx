export default function UsagePage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Usage Limits</h1>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-8">
        {/* Users */}
        <div>
           <div className="flex justify-between items-end mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">User Seats</h3>
                <p className="text-sm text-gray-500">Number of active team members in your workspace.</p>
              </div>
              <div className="text-sm font-medium text-gray-700">2 / 5</div>
           </div>
           <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border">
             <div className="bg-blue-600 h-full rounded-full" style={{ width: '40%' }}></div>
           </div>
        </div>

        {/* AI Usage */}
        <div>
           <div className="flex justify-between items-end mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">AI Requests</h3>
                <p className="text-sm text-gray-500">Credits used for predictive insights and transcription.</p>
              </div>
              <div className="text-sm font-medium text-gray-700">850 / 1000</div>
           </div>
           <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border">
             <div className="bg-orange-500 h-full rounded-full" style={{ width: '85%' }}></div>
           </div>
           <p className="text-xs text-orange-600 mt-2 font-medium">Warning: You are approaching your AI limit for this billing cycle.</p>
        </div>

        {/* Storage */}
        <div>
           <div className="flex justify-between items-end mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">Storage Quota</h3>
                <p className="text-sm text-gray-500">Space consumed by attachments and call recordings.</p>
              </div>
              <div className="text-sm font-medium text-gray-700">10 GB / 50 GB</div>
           </div>
           <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border">
             <div className="bg-green-500 h-full rounded-full" style={{ width: '20%' }}></div>
           </div>
        </div>

      </div>
    </div>
  );
}
