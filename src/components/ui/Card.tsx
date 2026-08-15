import * as React from 'react';
import { cn } from '@/lib/utils';

// GlassCard — matches Nexus CRM .glass-panel pattern
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.1rem] border border-white/[.08] transition-all duration-200",
        // glass-panel from reference
        "backdrop-blur-[24px] saturate-[1.8]",
        className
      )}
      style={{
        background: "linear-gradient(180deg, rgba(27,35,64,.65), rgba(13,19,38,.65))",
        boxShadow: "0 8px 32px rgba(0,0,0,.35)",
      }}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-5", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display font-semibold text-base leading-snug text-white", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5 pt-0", className)} {...props} />
  );
}

// KpiCard — the .kpi-card + card-hover pattern from reference
export function KpiCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.1rem] p-4",
        "border border-white/[.08]",
        "transition-all duration-200 hover:-translate-y-[3px]",
        "backdrop-blur-[24px] saturate-[1.8]",
        className
      )}
      style={{
        background: "linear-gradient(180deg, rgba(27,35,64,.65), rgba(13,19,38,.65))",
        boxShadow: "0 8px 32px rgba(0,0,0,.35)",
      }}
      {...props}
    />
  );
}

// GlassPanel without the card-hover, for static containers
export function GlassPanel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.1rem] border border-white/[.08]",
        "backdrop-blur-[24px] saturate-[1.8]",
        className
      )}
      style={{
        background: "linear-gradient(180deg, rgba(27,35,64,.65), rgba(13,19,38,.65))",
        boxShadow: "0 8px 32px rgba(0,0,0,.35)",
      }}
      {...props}
    />
  );
}
