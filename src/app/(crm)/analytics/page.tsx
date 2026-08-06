export default function AnalyticsDashboardPage() {
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
               <div className="text-2xl font-bold">142</div>
               <div className="text-xs text-green-600 mt-1">↑ 12% vs last month</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
               <div className="text-sm text-gray-500 mb-1">Conversion Rate</div>
               <div className="text-2xl font-bold">18.4%</div>
               <div className="text-xs text-green-600 mt-1">↑ 2.1% vs last month</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
               <div className="text-sm text-gray-500 mb-1">Customer Growth</div>
               <div className="text-2xl font-bold">+26</div>
               <div className="text-xs text-green-600 mt-1">↑ 5% vs last month</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
               <div className="text-sm text-gray-500 mb-1">Task Completion</div>
               <div className="text-2xl font-bold">94%</div>
               <div className="text-xs text-gray-500 mt-1">- 0% vs last month</div>
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
                  <div className="flex justify-between"><span className="text-gray-500">Sent:</span> <span>1,240</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Delivered:</span> <span className="text-green-600">1,215</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Failed/Bounced:</span> <span className="text-red-600">25 (2%)</span></div>
               </div>
            </div>
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
               <h3 className="font-semibold text-gray-700 mb-3 text-sm">Telephony (Calls)</h3>
               <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Total Calls:</span> <span>312</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Total Duration:</span> <span>18h 42m</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Success Rate:</span> <span className="text-green-600">88%</span></div>
               </div>
            </div>
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
               <h3 className="font-semibold text-gray-700 mb-3 text-sm">WhatsApp Business</h3>
               <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Sent:</span> <span>840</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Delivered:</span> <span className="text-green-600">838</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Read:</span> <span>710 (84%)</span></div>
               </div>
            </div>
         </div>
      </section>

      {/* Billing & Usage Metrics Section */}
      <section>
         <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Billing & System Usage</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
               <h3 className="font-semibold text-gray-700 mb-3 text-sm">Revenue Metrics</h3>
               <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b">
                     <span className="text-sm text-gray-500">Monthly Recurring Revenue (MRR)</span>
                     <span className="font-bold text-gray-900">$1,450.00</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                     <span className="text-sm text-gray-500">Annual Recurring Revenue (ARR)</span>
                     <span className="font-bold text-gray-900">$17,400.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-sm text-gray-500">Failed Payments</span>
                     <span className="text-sm text-red-600 font-medium">0 this month</span>
                  </div>
               </div>
            </div>
            
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
               <h3 className="font-semibold text-gray-700 mb-3 text-sm">System Consumption</h3>
               <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b">
                     <span className="text-sm text-gray-500">Storage Volume</span>
                     <span className="text-sm font-medium text-gray-900">14.2 GB (Audio + PDF)</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                     <span className="text-sm text-gray-500">Generative AI Requests</span>
                     <span className="text-sm font-medium text-gray-900">422 / 1000</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-sm text-gray-500">Internal API Calls</span>
                     <span className="text-sm font-medium text-gray-900">45,120</span>
                  </div>
               </div>
            </div>
         </div>
      </section>

    </div>
  );
}
