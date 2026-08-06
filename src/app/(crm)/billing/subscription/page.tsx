export default function SubscriptionPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Manage Subscription</h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
         <div className="flex justify-between items-start mb-6 border-b pb-6">
            <div>
               <h3 className="text-lg font-semibold text-gray-900">Starter Plan</h3>
               <p className="text-gray-500 text-sm mt-1">Billed $29.00 monthly. Next charge on August 24, 2026.</p>
            </div>
            <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">Active</span>
         </div>

         <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Payment Method</h4>
            <div className="flex items-center space-x-4 p-4 border rounded-lg bg-gray-50">
               <div className="w-12 h-8 bg-blue-800 rounded flex items-center justify-center text-white text-xs font-bold italic">VISA</div>
               <div>
                  <div className="text-sm font-medium">Visa ending in 4242</div>
                  <div className="text-xs text-gray-500">Expires 12/28</div>
               </div>
               <div className="flex-1 text-right">
                 <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Update</button>
               </div>
            </div>
         </div>

         <div className="mt-8 pt-6 border-t flex justify-between items-center">
            <form action="/api/billing/cancel" method="POST">
              <button type="submit" className="text-red-600 hover:text-red-800 text-sm font-medium">Cancel Subscription</button>
            </form>
            <a href="/billing/plans" className="bg-gray-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-black transition">Upgrade Plan</a>
         </div>
      </div>
    </div>
  );
}
