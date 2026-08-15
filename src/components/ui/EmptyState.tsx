import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-8 text-center rounded-[1.1rem]",
        "border border-white/[.08]",
        className
      )}
      style={{
        background: "linear-gradient(180deg, rgba(27,35,64,.65), rgba(13,19,38,.65))",
        boxShadow: "0 8px 32px rgba(0,0,0,.35)",
      }}
    >
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "rgba(124,92,252,.1)" }}
      >
        <span className="text-2xl" style={{ color: "var(--violet)" }}>
          {icon || <FileQuestion className="w-8 h-8" />}
        </span>
      </div>

      {/* Text */}
      <h3 className="font-display font-bold text-lg text-white mb-2">{title}</h3>
      <p className="text-sm max-w-xs mb-6" style={{ color: "#8891B0" }}>
        {description}
      </p>

      {/* Action */}
      {action && <div>{action}</div>}
    </div>
  );
}
