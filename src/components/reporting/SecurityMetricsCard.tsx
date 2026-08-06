export function SecurityMetricsCard({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Security Overview</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded text-center border">
          <p className="text-gray-500 text-sm font-semibold">Total Incidents</p>
          <p className="text-3xl font-black text-gray-800">{data.total}</p>
        </div>
        <div className="bg-red-50 p-4 rounded text-center border border-red-100">
          <p className="text-red-500 text-sm font-semibold">Critical</p>
          <p className="text-3xl font-black text-red-600">{data.critical}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded text-center border border-blue-100">
          <p className="text-blue-500 text-sm font-semibold">Open</p>
          <p className="text-3xl font-black text-blue-600">{data.open}</p>
        </div>
        <div className="bg-green-50 p-4 rounded text-center border border-green-100">
          <p className="text-green-500 text-sm font-semibold">Resolved</p>
          <p className="text-3xl font-black text-green-600">{data.resolved}</p>
        </div>
      </div>
      
      {/* Simple progress bar visualization for resolution rate */}
      <div className="mt-6">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium text-gray-700">Resolution Rate</span>
          <span>{data.total > 0 ? ((data.resolved / data.total) * 100).toFixed(1) : 0}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full" 
            style={{ width: `${data.total > 0 ? (data.resolved / data.total) * 100 : 0}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
