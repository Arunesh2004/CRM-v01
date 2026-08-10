'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface PaginationButtonProps {
  nextCursor: string | null;
  hasMore: boolean;
}

export function PaginationButton({ nextCursor, hasMore }: PaginationButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (!hasMore || !nextCursor) return null;

  return (
    <div className="flex justify-center mt-6 mb-8">
      <Button
        variant="outline"
        onClick={() => {
          const params = new URLSearchParams(searchParams.toString());
          params.set('cursor', nextCursor);
          router.push(`?${params.toString()}`);
        }}
      >
        Load More
      </Button>
    </div>
  );
}
