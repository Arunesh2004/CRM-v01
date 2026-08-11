"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, Loader2 } from "lucide-react";
import { searchAction } from "@/modules/search/actions/search.actions";
import { useDebounce } from "use-debounce";

type SearchResult = {
  id: string;
  type: "CUSTOMER" | "LEAD" | "TASK" | "EMPLOYEE";
  title: string;
  subtitle: string;
  url: string;
};

export function CommandPaletteCore({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (val: boolean) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [debouncedQuery] = useDebounce(query, 300);
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    async function fetchResults() {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      const res = await searchAction(debouncedQuery);
      if (res.success && res.data) {
        setResults(res.data);
      }
      setLoading(false);
    }
    fetchResults();
  }, [debouncedQuery]);

  const handleSelect = (url: string) => {
    setOpen(false);
    router.push(url);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <Command
        className="relative z-50 w-full max-w-2xl rounded-xl border bg-card text-foreground shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
        shouldFilter={false}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search customers, leads, tasks..."
            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            autoFocus
          />
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <Command.List className="max-h-[300px] overflow-y-auto p-2">
          {!loading && query.length > 1 && results.length === 0 && (
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>
          )}

          {!loading && query.length < 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search.
            </div>
          )}

          {results.length > 0 && (
            <Command.Group heading="Results">
              {results.map((result) => (
                <Command.Item
                  key={`${result.type}-${result.id}`}
                  value={result.id}
                  onSelect={() => handleSelect(result.url)}
                  className="flex cursor-pointer select-none items-center rounded-sm px-2 py-3 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{result.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {result.subtitle}
                    </span>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  );
}
