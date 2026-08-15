export default function GlobalSearchPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto py-8 animate-in fade-in duration-500">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-display font-bold mb-6 text-white tracking-tight">Global Search</h1>
        <div className="w-full max-w-2xl relative">
           <input 
             type="text" 
             placeholder="Search across customers, leads, messages, and invoices..." 
             className="w-full bg-[#0D1326]/40 border border-white/[.08] rounded-full py-3 px-6 pr-12 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 shadow-sm text-white placeholder:text-[#8891B0]"
           />
           <button className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#8891B0] hover:text-violet-400 transition-colors">
             <span className="text-xl">🔍</span>
           </button>
        </div>
      </div>
      
      {/* Search Categories / Filters */}
      <div className="flex space-x-6 border-b border-white/[.08] pb-4 mb-6">
         <button className="text-[11px] font-bold uppercase tracking-wider text-violet-400 border-b-2 border-violet-500 pb-2 -mb-4">All Results (3)</button>
         <button className="text-[11px] font-bold uppercase tracking-wider text-[#8891B0] hover:text-white pb-2 -mb-4 transition-colors">Customers (1)</button>
         <button className="text-[11px] font-bold uppercase tracking-wider text-[#8891B0] hover:text-white pb-2 -mb-4 transition-colors">Messages (1)</button>
         <button className="text-[11px] font-bold uppercase tracking-wider text-[#8891B0] hover:text-white pb-2 -mb-4 transition-colors">Invoices (1)</button>
      </div>

      <div className="space-y-4">
         {/* Customer Result */}
         <div className="glass-panel p-5 rounded-xl border border-white/[.08] hover:border-violet-500/30 transition-all cursor-pointer group">
            <div className="flex justify-between items-start mb-2">
               <h3 className="font-display font-bold text-lg text-white group-hover:text-violet-400 transition-colors">Acme Corporation</h3>
               <span className="bg-white/5 text-[#8891B0] border border-white/[.08] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Customer</span>
            </div>
            <p className="text-sm text-[#8891B0]">Enterprise software client. Located in New York, USA.</p>
            <div className="mt-4 text-xs font-mono text-[#8891B0]/70 flex space-x-6">
               <span>Email: contact@acme.com</span>
               <span>Created: Jan 12, 2026</span>
            </div>
         </div>

         {/* Message Result */}
         <div className="glass-panel p-5 rounded-xl border border-white/[.08] hover:border-violet-500/30 transition-all cursor-pointer group">
            <div className="flex justify-between items-start mb-2">
               <h3 className="font-display font-bold text-lg text-white group-hover:text-violet-400 transition-colors">RE: Acme Corporation Renewal</h3>
               <span className="bg-white/5 text-[#8891B0] border border-white/[.08] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Message</span>
            </div>
            <p className="text-sm text-[#8891B0]">"...we are happy to renew the contract for <span className="text-white bg-violet-500/20 px-1 rounded">Acme Corporation</span> starting next month..."</p>
            <div className="mt-4 text-xs font-mono text-[#8891B0]/70 flex space-x-6">
               <span>From: alice@acme.com</span>
               <span>Date: Aug 1, 2026</span>
            </div>
         </div>

         {/* Invoice Result */}
         <div className="glass-panel p-5 rounded-xl border border-white/[.08] hover:border-violet-500/30 transition-all cursor-pointer group">
            <div className="flex justify-between items-start mb-2">
               <h3 className="font-display font-bold text-lg text-white group-hover:text-violet-400 transition-colors">INV-2026-0042 (Acme Corporation)</h3>
               <span className="bg-white/5 text-[#8891B0] border border-white/[.08] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Invoice</span>
            </div>
            <p className="text-sm text-[#8891B0]">Payment for Professional Plan ($99.00).</p>
            <div className="mt-4 text-xs font-mono text-[#8891B0]/70 flex space-x-6">
               <span>Status: Paid</span>
               <span>Date: Jul 24, 2026</span>
            </div>
         </div>
      </div>
    </div>
  );
}
