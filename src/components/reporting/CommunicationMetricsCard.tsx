export function CommunicationMetricsCard({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Communication Overview</h2>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded text-center border">
          <p className="text-gray-500 text-sm font-semibold">Total Dispatched</p>
          <p className="text-3xl font-black text-gray-800">{data.total}</p>
        </div>
        <div className="bg-indigo-50 p-4 rounded text-center border border-indigo-100">
          <p className="text-indigo-500 text-sm font-semibold">Success Rate</p>
          <p className="text-3xl font-black text-indigo-600">{data.successRate}%</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 mb-2">Channel Breakdown</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Email</span>
              <span className="font-medium">{data.email}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${data.total > 0 ? (data.email/data.total)*100 : 0}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>SMS</span>
              <span className="font-medium">{data.sms}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${data.total > 0 ? (data.sms/data.total)*100 : 0}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>WhatsApp</span>
              <span className="font-medium">{data.whatsapp}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${data.total > 0 ? (data.whatsapp/data.total)*100 : 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
