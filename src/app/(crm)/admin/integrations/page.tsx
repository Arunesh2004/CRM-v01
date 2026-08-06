export default function IntegrationsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold">Integrations</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Email */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
           <div className="flex justify-between items-center mb-4 border-b pb-4">
              <h3 className="font-semibold text-lg text-gray-900">Email Provider</h3>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">Connected</span>
           </div>
           <p className="text-sm text-gray-600 mb-4">Domain verified and capable of sending and receiving emails via Resend.</p>
           <div className="text-sm">
             <span className="font-medium">Verified Domain:</span> acme.com
           </div>
           <div className="mt-4 flex space-x-2">
             <button className="text-blue-600 hover:underline text-sm">Configure Domain</button>
           </div>
        </div>

        {/* WhatsApp */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
           <div className="flex justify-between items-center mb-4 border-b pb-4">
              <h3 className="font-semibold text-lg text-gray-900">WhatsApp Business API</h3>
              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">Not Connected</span>
           </div>
           <p className="text-sm text-gray-600 mb-4">Connect Meta WhatsApp API to receive and send messages directly from the CRM inbox.</p>
           <div className="mt-4 flex space-x-2">
             <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">Connect Meta Account</button>
           </div>
        </div>

        {/* Storage */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
           <div className="flex justify-between items-center mb-4 border-b pb-4">
              <h3 className="font-semibold text-lg text-gray-900">Cloud Storage</h3>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">System Managed</span>
           </div>
           <p className="text-sm text-gray-600 mb-4">All recordings and attachments are securely routed to AWS S3 using encrypted signed URLs.</p>
           <div className="text-sm text-gray-500 italic">Storage is managed automatically by your subscription tier.</div>
        </div>

      </div>
    </div>
  );
}
