import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        // Nexus CRM glass input style
        "w-full min-w-0",
        "rounded-[.7rem] px-3.5 py-2.5",
        "text-sm text-[#E7EAF5]",
        "bg-[rgba(20,27,51,.55)] backdrop-blur-[20px]",
        "border border-white/[.08]",
        "placeholder:text-[#8891B0]",
        "transition-all duration-200",
        "outline-none",
        "focus:border-[#7C5CFC] focus:ring-2 focus:ring-[rgba(124,92,252,.2)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#E7EAF5]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
