"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "./Skeleton";

export const SalesChartClientWrapper = dynamic(
  () => import("./SalesChart").then((mod) => mod.SalesChart),
  {
    loading: () => <Skeleton className="h-[350px] w-full rounded-xl" />,
    ssr: false,
  },
);
