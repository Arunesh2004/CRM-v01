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
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-4 h-4 text-muted-foreground" />
        </div>
        <input
          type="text"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filters.map((filter) => (
        <select
          key={filter.key}
          className="flex h-10 w-full sm:w-48 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={searchParams.get(filter.key) || ''}
          onChange={(e) => {
            router.push(`?${createQueryString(filter.key, e.target.value)}`);
          }}
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
