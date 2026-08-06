export default function GlobalSearchPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto py-8">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Global Search</h1>
        <div className="w-full max-w-2xl relative">
           <input 
             type="text" 
             placeholder="Search across customers, leads, messages, and invoices..." 
             className="w-full border-2 border-gray-300 rounded-full py-3 px-6 pr-12 focus:outline-none focus:border-blue-500 shadow-sm text-lg"
           />
           <button className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-500">
             <span className="text-xl">🔍</span>
           </button>
        </div>
      </div>
      
      {/* Search Categories / Filters */}
      <div className="flex space-x-4 border-b pb-4 mb-6">
         <button className="font-semibold text-blue-600 border-b-2 border-blue-600 pb-1">All Results (3)</button>
         <button className="font-medium text-gray-500 hover:text-gray-800 pb-1">Customers (1)</button>
         <button className="font-medium text-gray-500 hover:text-gray-800 pb-1">Messages (1)</button>
         <button className="font-medium text-gray-500 hover:text-gray-800 pb-1">Invoices (1)</button>
      </div>

      <div className="space-y-4">
         {/* Customer Result */}
         <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md cursor-pointer">
            <div className="flex justify-between items-start mb-2">
               <h3 className="font-semibold text-lg text-blue-700">Acme Corporation</h3>
               <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded uppercase tracking-wider">Customer</span>
            </div>
            <p className="text-sm text-gray-600">Enterprise software client. Located in New York, USA.</p>
            <div className="mt-3 text-xs text-gray-500 flex space-x-4">
               <span>Email: contact@acme.com</span>
               <span>Created: Jan 12, 2026</span>
            </div>
         </div>

         {/* Message Result */}
         <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md cursor-pointer">
            <div className="flex justify-between items-start mb-2">
               <h3 className="font-semibold text-lg text-blue-700">RE: Acme Corporation Renewal</h3>
               <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded uppercase tracking-wider">Message</span>
            </div>
            <p className="text-sm text-gray-600">"...we are happy to renew the contract for <span className="bg-yellow-100 font-medium">Acme Corporation</span> starting next month..."</p>
            <div className="mt-3 text-xs text-gray-500 flex space-x-4">
               <span>From: alice@acme.com</span>
               <span>Date: Aug 1, 2026</span>
            </div>
         </div>

         {/* Invoice Result */}
         <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md cursor-pointer">
            <div className="flex justify-between items-start mb-2">
               <h3 className="font-semibold text-lg text-blue-700">INV-2026-0042 (Acme Corporation)</h3>
               <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded uppercase tracking-wider">Invoice</span>
            </div>
            <p className="text-sm text-gray-600">Payment for Professional Plan ($99.00).</p>
            <div className="mt-3 text-xs text-gray-500 flex space-x-4">
               <span>Status: Paid</span>
               <span>Date: Jul 24, 2026</span>
            </div>
         </div>
      </div>
    </div>
  );
}
