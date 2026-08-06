export function CrmMetricsCard({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">CRM Overview</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-purple-50 p-4 rounded text-center border border-purple-100">
          <p className="text-purple-600 text-sm font-semibold">Leads</p>
          <p className="text-3xl font-black text-purple-700">{data.leads}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded text-center border border-blue-100">
          <p className="text-blue-600 text-sm font-semibold">Customers</p>
          <p className="text-3xl font-black text-blue-700">{data.customers}</p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 border rounded flex items-center justify-between">
        <span className="font-medium text-gray-700">Conversion Rate</span>
        <span className="text-2xl font-black text-gray-800">{data.conversionRate}%</span>
      </div>
    </div>
  );
}
