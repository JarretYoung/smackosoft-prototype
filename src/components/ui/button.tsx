import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/src/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "pressable inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-subhead font-semibold whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 aria-invalid:ring-[3px] aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:[stroke-width:2.5] [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Filled: the one primary action in a view.
        // Disabled is gray, not a faded red. While it is saving (a spinner inside) it stays red.
        default:
          "bg-primary text-primary-foreground hover:bg-primary/92 disabled:bg-foreground/10 disabled:text-muted-foreground disabled:opacity-100 disabled:has-[[role=status]]:bg-primary disabled:has-[[role=status]]:text-primary-foreground disabled:has-[[role=status]]:opacity-70",
        // Tinted: a quiet, colored action.
        tinted: "bg-accent text-accent-foreground hover:bg-primary/15",
        // Text: a colored action with no fill and no hover area, for small actions on the page gray.
        // It has no side padding, so its text lines up with the content around it. See the compound variant.
        text: "text-primary",
        // Bare: an icon with no shape of its own. A faint circle shows on hover, pointers only, never on touch.
        // For navigation, header actions and row menus. Pair it with an icon size.
        bare: "text-primary hover:bg-foreground/6",
        // Gray fill: a neutral secondary action.
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        outline: "bg-card text-foreground shadow-card hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive/15",
        link: "rounded-md text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 has-[>svg]:px-4",
        xs: "h-7 gap-1 px-3 text-xs has-[>svg]:px-2",
        sm: "h-9 gap-1.5 px-4 text-sm has-[>svg]:px-3",
        lg: "h-[3.25rem] px-7 text-base has-[>svg]:px-5",
        // Icon sizes: the hit area is always 44. The icon inside is 20, or 24 for navigation and
        // header actions (pass `size-6` on the svg). A shape smaller than 44 grows its hit area with a pseudo element.
        icon: "size-11 [&_svg:not([class*='size-'])]:size-5",
        "icon-xs": "relative size-7 after:absolute after:-inset-2 after:content-['']",
        "icon-sm": "relative size-9 after:absolute after:-inset-1 after:content-[''] [&_svg:not([class*='size-'])]:size-5",
        "icon-lg": "size-12 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    compoundVariants: [
      // Flush to the edge, with the tap area pushed out 8px each side by a pseudo element.
      { variant: "text", className: "relative px-0 has-[>svg]:px-0 after:absolute after:-inset-x-2 after:inset-y-0 after:content-['']" },
    ],
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
