import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border-0 bg-input px-3.5 text-base text-foreground transition-[background-color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:bg-card focus-visible:ring-[3px] focus-visible:ring-ring",
        "aria-invalid:ring-[3px] aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
