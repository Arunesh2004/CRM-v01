export default function ConversationPage({ params }: { params: { conversationId: string } }) {
  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="h-16 border-b flex items-center px-6 justify-between bg-white z-10">
        <div>
          <h2 className="font-semibold">Global Industries</h2>
          <div className="text-xs text-gray-500">Contact: john@global.com • +1 555-0192</div>
        </div>
        <div className="flex space-x-2">
          <button className="px-3 py-1 text-sm border rounded hover:bg-gray-50">Call</button>
        </div>
      </div>
      
      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
        
        {/* Email Bubble */}
        <div className="flex flex-col space-y-1">
          <div className="text-xs text-gray-500 flex justify-between max-w-2xl mx-auto w-full">
             <span>John (Client) via Email</span>
             <span>Yesterday, 2:40 PM</span>
          </div>
          <div className="bg-white border p-4 rounded-lg shadow-sm max-w-2xl mx-auto w-full">
            <h4 className="font-medium text-sm mb-2 border-b pb-2">Subject: Signed Contract</h4>
            <p className="text-sm text-gray-700">Please find the signed agreement attached. We are ready to proceed with the implementation.</p>
            <div className="mt-3 p-2 bg-gray-50 border rounded text-xs flex items-center space-x-2 text-blue-600 cursor-pointer">
              <span>📎</span> <span>contract_signed_final.pdf</span>
            </div>
          </div>
        </div>

        {/* WhatsApp Bubble (Outbound) */}
         <div className="flex flex-col space-y-1 items-end">
          <div className="text-xs text-gray-500 flex justify-between max-w-md w-full ml-auto">
             <span>You via WhatsApp</span>
             <span>Today, 9:00 AM</span>
          </div>
          <div className="bg-green-50 border border-green-100 p-3 rounded-lg shadow-sm max-w-md w-full ml-auto">
            <p className="text-sm text-gray-800">Received! We will begin the kickoff process immediately. Thank you.</p>
            <div className="text-right mt-1 text-[10px] text-gray-400">Read ✔✔</div>
          </div>
        </div>

        {/* Telephony Bubble */}
        <div className="flex flex-col space-y-1">
          <div className="text-xs text-gray-500 flex justify-between max-w-2xl mx-auto w-full">
             <span>System via Telephony</span>
             <span>Today, 10:30 AM</span>
          </div>
          <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm max-w-2xl mx-auto w-full flex justify-between items-center">
            <div className="flex items-center space-x-3">
               <span className="text-xl">📞</span>
               <div>
                 <div className="text-sm font-medium">Outbound Call (Completed)</div>
                 <div className="text-xs text-gray-500">Duration: 14m 22s</div>
               </div>
            </div>
            <button className="text-sm text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1 rounded">Play Recording</button>
          </div>
        </div>

      </div>

      {/* Composer */}
      <div className="p-4 bg-white border-t">
        <div className="flex space-x-2 mb-2">
           <button className="text-xs font-medium text-gray-500 hover:text-gray-900 bg-gray-100 px-3 py-1 rounded">Email</button>
           <button className="text-xs font-medium text-gray-500 hover:text-green-700 bg-gray-100 hover:bg-green-50 px-3 py-1 rounded">WhatsApp</button>
           <button className="text-xs font-medium text-gray-500 hover:text-blue-700 bg-gray-100 hover:bg-blue-50 px-3 py-1 rounded">SMS</button>
        </div>
        <div className="border rounded-lg shadow-sm focus-within:ring-1 focus-within:ring-blue-500">
           <textarea className="w-full p-3 outline-none resize-none text-sm" rows={3} placeholder="Reply via Email..."></textarea>
           <div className="bg-gray-50 p-2 flex justify-between items-center rounded-b-lg border-t">
              <div className="flex space-x-2 text-gray-400">
                 <button className="hover:text-gray-600">📎</button>
                 <button className="hover:text-gray-600">⚡</button>
              </div>
              <button className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700">Send</button>
           </div>
        </div>
      </div>

    </div>
  );
}
