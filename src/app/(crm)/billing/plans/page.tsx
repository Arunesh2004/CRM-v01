export default function PlansPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">Upgrade your Workspace</h1>
        <p className="text-gray-500">Choose the perfect plan for your team's needs.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Starter Plan */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col relative">
           <div className="absolute top-0 right-0 bg-gray-100 text-gray-600 px-3 py-1 text-xs font-semibold rounded-bl-lg rounded-tr-xl">Current</div>
           <h3 className="text-xl font-bold mb-2">Starter</h3>
           <div className="mb-4">
             <span className="text-4xl font-extrabold">$29</span><span className="text-gray-500">/mo</span>
           </div>
           <ul className="space-y-3 mb-8 flex-1 text-sm text-gray-600">
             <li className="flex items-center">✔ 5 Users</li>
             <li className="flex items-center">✔ 50GB Storage</li>
             <li className="flex items-center">✔ Basic CRM Features</li>
           </ul>
           <button className="w-full py-2 bg-gray-100 text-gray-400 font-semibold rounded cursor-not-allowed" disabled>Current Plan</button>
        </div>

        {/* Pro Plan */}
        <div className="bg-white p-8 rounded-xl shadow-md border-2 border-blue-500 flex flex-col relative transform scale-105">
           <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-1 text-xs font-bold rounded-full">Most Popular</div>
           <h3 className="text-xl font-bold mb-2 text-blue-900">Professional</h3>
           <div className="mb-4">
             <span className="text-4xl font-extrabold text-blue-900">$99</span><span className="text-gray-500">/mo</span>
           </div>
           <ul className="space-y-3 mb-8 flex-1 text-sm text-gray-700">
             <li className="flex items-center font-medium">✔ 20 Users</li>
             <li className="flex items-center font-medium">✔ 500GB Storage</li>
             <li className="flex items-center font-medium">✔ Advanced Reporting</li>
             <li className="flex items-center font-medium">✔ Custom Domain</li>
           </ul>
           {/* Form triggers Server Action securely */}
           <form action="/api/checkout/pro" method="POST">
              <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition">Upgrade to Pro</button>
           </form>
        </div>

        {/* Enterprise Plan */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col">
           <h3 className="text-xl font-bold mb-2">Enterprise</h3>
           <div className="mb-4">
             <span className="text-4xl font-extrabold">$299</span><span className="text-gray-500">/mo</span>
           </div>
           <ul className="space-y-3 mb-8 flex-1 text-sm text-gray-600">
             <li className="flex items-center">✔ Unlimited Users</li>
             <li className="flex items-center">✔ 5TB Storage</li>
             <li className="flex items-center">✔ Priority Support</li>
             <li className="flex items-center">✔ Dedicated Account Manager</li>
           </ul>
           <form action="/api/checkout/enterprise" method="POST">
             <button type="submit" className="w-full py-2 bg-gray-900 hover:bg-black text-white font-semibold rounded transition">Upgrade to Enterprise</button>
           </form>
        </div>
      </div>
    </div>
  );
}
