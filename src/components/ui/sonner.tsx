"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * A toast is a floating card like our sheets and dialogs: white, 2xl radius, float shadow.
 * Sonner ships its own colors and sizes, so the overrides are important.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-5 text-success" />,
        info: <InfoIcon className="size-5 text-muted-foreground" />,
        warning: <TriangleAlertIcon className="size-5 text-gold" />,
        error: <OctagonXIcon className="size-5 text-destructive" />,
        loading: <Loader2Icon className="size-5 animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        classNames: {
          toast: "!gap-3 !rounded-2xl !border-0 !bg-card !px-4 !py-3 !text-subhead !font-medium !text-foreground !shadow-float",
          title: "!font-medium",
          description: "!text-sm !font-normal !text-muted-foreground",
          // The tap target is 44px tall, so the card grows around it instead of the button shrinking.
          actionButton:
            "pressable !-my-1.5 !-mr-2 !h-11 !rounded-full !bg-accent !px-4 !text-subhead !font-semibold !text-accent-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
