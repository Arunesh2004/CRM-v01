import { getDashboardMetricsAction } from '@/modules/reporting/actions/reporting.actions';

export default async function AnalyticsDashboardPage() {
  const metricsResult = await getDashboardMetricsAction();
  const data = metricsResult.success ? metricsResult.data : null;

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Executive Analytics</h1>
        <div className="flex space-x-2">
           <select className="border p-2 rounded text-sm bg-white text-gray-700">
             <option>Last 30 Days</option>
             <option>Last 90 Days</option>
             <option>Year to Date</option>
           </select>
        </div>
      </div>
      
      {/* CRM Performance Section */}
      <section>
         <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">CRM Performance</h2>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
               <div className="text-sm text-gray-500 mb-1">New Leads</div>
               <div className="text-2xl font-bold">{data?.crm?.leads ?? 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
               <div className="text-sm text-gray-500 mb-1">Conversion Rate</div>
               <div className="text-2xl font-bold">{data?.crm?.conversionRate ?? 0}%</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
               <div className="text-sm text-gray-500 mb-1">Customers</div>
               <div className="text-2xl font-bold">{data?.crm?.customers ?? 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
               <div className="text-sm text-gray-500 mb-1">Tasks</div>
               <div className="text-2xl font-bold">{data?.crm?.tasks ?? 0}</div>
            </div>
         </div>
      </section>

      {/* Communication Metrics Section */}
      <section>
         <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Communication Metrics</h2>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
               <h3 className="font-semibold text-gray-700 mb-3 text-sm">Email Delivery</h3>
               <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Sent:</span> <span>{data?.communication?.email ?? 0}</span></div>
               </div>
            </div>
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
               <h3 className="font-semibold text-gray-700 mb-3 text-sm">Telephony (Calls)</h3>
               <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Total Calls:</span> <span>{data?.communication?.calls ?? 0}</span></div>
               </div>
            </div>
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
               <h3 className="font-semibold text-gray-700 mb-3 text-sm">WhatsApp Business</h3>
               <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Sent:</span> <span>{data?.communication?.whatsapp ?? 0}</span></div>
               </div>
            </div>
         </div>
      </section>

      {/* Billing & System Usage Section */}
      <section>
         <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Billing & System Usage</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
               <h3 className="font-semibold text-gray-700 mb-3 text-sm">Revenue Metrics</h3>
               <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b">
                     <span className="text-sm text-gray-500">Monthly Recurring Revenue (MRR)</span>
                     <span className="font-bold text-gray-900">${data?.billing?.mrr ?? '0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                     <span className="text-sm text-gray-500">Annual Recurring Revenue (ARR)</span>
                     <span className="font-bold text-gray-900">${data?.billing?.arr ?? '0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-sm text-gray-500">Active Subscriptions</span>
                     <span className="text-sm font-medium text-gray-900">{data?.billing?.subscriptions ?? 0}</span>
                  </div>
               </div>
            </div>
            
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
               <h3 className="font-semibold text-gray-700 mb-3 text-sm">Security & Incidents</h3>
               <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b">
                     <span className="text-sm text-gray-500">Total Incidents</span>
                     <span className="text-sm font-medium text-gray-900">{data?.security?.total ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                     <span className="text-sm text-gray-500">Critical Alerts</span>
                     <span className="text-sm font-medium text-red-600">{data?.security?.critical ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-sm text-gray-500">Active Cameras</span>
                     <span className="text-sm font-medium text-gray-900">{data?.camera?.active ?? 0}</span>
                  </div>
               </div>
            </div>
         </div>
      </section>

    </div>
  );
}
