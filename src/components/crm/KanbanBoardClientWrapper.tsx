"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

function KanbanSkeleton() {
  return (
    <div className="flex space-x-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="w-80 space-y-4 shrink-0">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ))}
    </div>
  );
}

export const KanbanBoardClientWrapper = dynamic(
  () => import("./KanbanBoard").then((mod) => mod.KanbanBoard),
  {
    ssr: false,
    loading: () => <KanbanSkeleton />,
  },
);
