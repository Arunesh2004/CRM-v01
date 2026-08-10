'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export function Tabs({ defaultValue, children, className }: { defaultValue: string, children: React.ReactNode, className?: string }) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <div className={cn("flex flex-col", className)}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { activeTab, setActiveTab } as any);
        }
        return child;
      })}
    </div>
  );
}

export function TabsList({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 border-b border-border overflow-x-auto custom-scrollbar pb-px", className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, activeTab, setActiveTab, className }: any) {
  const isActive = activeTab === value;
  return (
    <button
      onClick={() => setActiveTab(value)}
      className={cn(
        "px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap border-b-2",
        isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, activeTab, className }: any) {
  if (activeTab !== value) return null;
  return <div className={cn("mt-4", className)}>{children}</div>;
}
