'use client';

import { useState, useEffect, useCallback } from 'react';
import { searchAction } from '@/modules/search/actions/search.actions';
import { SearchResult } from '@/modules/search/search.service';
import Link from 'next/link';

export default function GlobalSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search effect
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const handler = setTimeout(async () => {
      setLoading(true);
      setError(null);
      
      const res = await searchAction(query);
      if (res.success && res.data) {
        setResults(res.data);
      } else {
        setError(res.error || 'Search failed');
        setResults([]);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-8 animate-in fade-in duration-500">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-display font-bold mb-6 text-white tracking-tight">Global Search</h1>
        <div className="w-full max-w-2xl relative">
           <input 
             type="text" 
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             placeholder="Search across customers, leads, messages, and invoices..." 
             className="w-full bg-[#0D1326]/40 border border-white/[.08] rounded-full py-3 px-6 pr-12 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 shadow-sm text-white placeholder:text-[#8891B0]"
           />
           <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#8891B0]">
             {loading ? (
               <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
             ) : (
               <span className="text-xl">🔍</span>
             )}
           </div>
        </div>
      </div>
      
      {/* Search Categories / Filters (simplified for now) */}
      <div className="flex space-x-6 border-b border-white/[.08] pb-4 mb-6">
         <button className="text-[11px] font-bold uppercase tracking-wider text-violet-400 border-b-2 border-violet-500 pb-2 -mb-4">All Results ({results.length})</button>
      </div>

      <div className="space-y-4">
         {error && (
           <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
             {error}
           </div>
         )}
         
         {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
           <div className="p-12 text-center text-[#8891B0]">
             No accessible results found for "{query}".
           </div>
         )}

         {results.map((result) => (
           <Link href={result.url} key={`${result.type}-${result.id}`} className="block">
             <div className="glass-panel p-5 rounded-xl border border-white/[.08] hover:border-violet-500/30 transition-all cursor-pointer group mb-4">
                <div className="flex justify-between items-start mb-2">
                   <h3 className="font-display font-bold text-lg text-white group-hover:text-violet-400 transition-colors">{result.title}</h3>
                   <span className="bg-white/5 text-[#8891B0] border border-white/[.08] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                     {result.type}
                   </span>
                </div>
                <p className="text-sm text-[#8891B0]">{result.subtitle}</p>
             </div>
           </Link>
         ))}
      </div>
    </div>
  );
}
