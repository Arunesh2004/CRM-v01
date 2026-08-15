'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Search } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { useEffect } from 'react';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  filters?: {
    key: string;
    label: string;
    options: FilterOption[];
  }[];
}

export function FilterBar({ filters = [] }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [debouncedSearch] = useDebounce(searchTerm, 300);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      // Reset cursor when filters change
      params.delete('cursor');
      return params.toString();
    },
    [searchParams]
  );

  useEffect(() => {
    if (debouncedSearch !== (searchParams.get('search') || '')) {
      router.push(`?${createQueryString('search', debouncedSearch)}`);
    }
  }, [debouncedSearch, router, createQueryString, searchParams]);

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center w-full mb-4">
      <div className="relative w-full sm:w-72">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
          <Search className="w-4 h-4" style={{ color: '#8891B0' }} />
        </div>
        <input
          type="text"
          className="w-full text-sm transition-all placeholder:text-[#8891B0] focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent"
          style={{
            background: 'rgba(20,27,51,.55)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: '.7rem',
            padding: '.6rem 1rem .6rem 2.5rem',
            color: '#E7EAF5',
            outline: 'none',
          }}
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filters.map((filter) => (
        <select
          key={filter.key}
          className="w-full sm:w-48 text-sm transition-all focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent appearance-none cursor-pointer"
          style={{
            background: 'rgba(20,27,51,.55) url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%238891B0%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E") no-repeat right .8rem top 50%',
            backgroundSize: '.65rem auto',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: '.7rem',
            padding: '.6rem 2rem .6rem 1rem',
            color: searchParams.get(filter.key) ? '#E7EAF5' : '#8891B0',
            outline: 'none',
          }}
          value={searchParams.get(filter.key) || ''}
          onChange={(e) => {
            router.push(`?${createQueryString(filter.key, e.target.value)}`);
          }}
        >
          <option value="" style={{ background: '#0D1326', color: '#8891B0' }}>{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ background: '#0D1326', color: '#E7EAF5' }}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
