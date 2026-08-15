import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" |
            "violet" | "emerald" | "amber" | "rose" | "cyan" | "slate"
}

// Maps our old variant names and adds the new Nexus CRM color tokens
const variantStyles: Record<string, string> = {
  default:     "bg-[rgba(124,92,252,.12)] text-[#7C5CFC]",         // = badge-violet
  violet:      "bg-[rgba(124,92,252,.12)] text-[#7C5CFC]",
  success:     "bg-[rgba(16,185,129,.12)] text-[#10B981]",          // = badge-emerald
  emerald:     "bg-[rgba(16,185,129,.12)] text-[#10B981]",
  secondary:   "bg-[rgba(245,166,35,.14)] text-[#F5A623]",          // = badge-amber
  amber:       "bg-[rgba(245,166,35,.14)] text-[#F5A623]",
  destructive: "bg-[rgba(244,63,94,.12)] text-[#F43F5E]",           // = badge-rose
  rose:        "bg-[rgba(244,63,94,.12)] text-[#F43F5E]",
  cyan:        "bg-[rgba(34,211,238,.12)] text-[#22D3EE]",
  slate:       "bg-[rgba(100,116,139,.12)] text-[#8891B0]",
  outline:     "border border-white/10 text-[#E7EAF5]",
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        // Reference: .badge
        "inline-flex items-center gap-1 rounded-full font-semibold",
        "text-[.68rem] leading-none px-[.55rem] py-[.15rem] tracking-[.02em]",
        variantStyles[variant] ?? variantStyles.default,
        className
      )}
      {...props}
    />
  )
}

export { Badge }
