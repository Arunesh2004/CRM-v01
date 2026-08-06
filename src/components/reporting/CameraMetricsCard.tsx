export function CameraMetricsCard({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Camera Health</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded text-center border">
          <p className="text-gray-500 text-sm font-semibold">Total Provisioned</p>
          <p className="text-3xl font-black text-gray-800">{data.total}</p>
        </div>
        <div className="bg-green-50 p-4 rounded text-center border border-green-100">
          <p className="text-green-500 text-sm font-semibold">Active Streams</p>
          <p className="text-3xl font-black text-green-600">{data.active}</p>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium text-gray-700">Online Rate</span>
          <span>{data.total > 0 ? ((data.active / data.total) * 100).toFixed(1) : 0}%</span>
        </div>
        <div className="w-full bg-red-200 rounded-full h-2 flex overflow-hidden">
          <div 
            className="bg-green-500 h-2" 
            style={{ width: `${data.total > 0 ? (data.active / data.total) * 100 : 0}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-right">{data.offline} offline</p>
      </div>
    </div>
  );
}
