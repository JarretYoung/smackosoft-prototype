import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "pressable inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-[0.9375rem] font-semibold whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 aria-invalid:ring-[3px] aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1.125rem]",
  {
    variants: {
      variant: {
        // Filled: the one primary action in a view.
        // Disabled is gray, not a faded red. While it is saving (a spinner inside) it stays red.
        default:
          "bg-primary text-primary-foreground hover:bg-primary/92 disabled:bg-foreground/10 disabled:text-muted-foreground disabled:opacity-100 disabled:has-[[role=status]]:bg-primary disabled:has-[[role=status]]:text-primary-foreground disabled:has-[[role=status]]:opacity-70",
        // Tinted: a quiet, colored action.
        tinted: "bg-accent text-accent-foreground hover:bg-primary/15",
        // Text: a colored action with no fill, for small actions on the page gray.
        text: "text-primary hover:bg-primary/10",
        // Gray fill: a neutral secondary action.
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        outline: "bg-card text-foreground shadow-card hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive/15",
        link: "rounded-md text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 has-[>svg]:px-4",
        xs: "h-7 gap-1 px-3 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 px-4 text-sm has-[>svg]:px-3",
        lg: "h-[3.25rem] px-7 text-base has-[>svg]:px-5",
        icon: "size-11",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
