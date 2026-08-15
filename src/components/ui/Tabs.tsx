'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

// Nexus CRM tab system — glass pill container, violet active state
export function Tabs({
  defaultValue,
  children,
  className,
}: {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <div className={cn("flex flex-col", className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { activeTab, setActiveTab } as any);
        }
        return child;
      })}
    </div>
  );
}

export function TabsList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 overflow-x-auto p-1 rounded-[.9rem]",
        className
      )}
      style={{
        background: "rgba(20,27,51,.6)",
        border: "1px solid rgba(255,255,255,.08)",
      }}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  activeTab,
  setActiveTab,
  className,
}: any) {
  const isActive = activeTab === value;
  return (
    <button
      onClick={() => setActiveTab(value)}
      className={cn(
        "px-3.5 py-2 rounded-[.7rem] text-xs font-medium whitespace-nowrap transition-all duration-200",
        isActive
          ? "bg-gradient-to-br from-[#7C5CFC] to-[#9B7BFF] text-white shadow-[0_4px_12px_rgba(124,92,252,.35)]"
          : "text-[#8891B0] hover:text-white hover:bg-white/5",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, activeTab, className }: any) {
  if (activeTab !== value) return null;
  return <div className={cn("mt-4 animate-in", className)}>{children}</div>;
}
