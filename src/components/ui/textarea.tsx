import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        // Nexus CRM glass textarea
        "w-full min-h-[80px] rounded-[.7rem] px-3.5 py-2.5",
        "text-sm text-[#E7EAF5]",
        "bg-[rgba(20,27,51,.55)] backdrop-blur-[20px]",
        "border border-white/[.08]",
        "placeholder:text-[#8891B0]",
        "transition-all duration-200 resize-y",
        "outline-none",
        "focus:border-[#7C5CFC] focus:ring-2 focus:ring-[rgba(124,92,252,.2)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
