import { ChevronRight } from "lucide-react";
import { cn } from "@/src/lib/utils";

/** The disclosure chevron at the end of a tappable row. One size and tone everywhere. */
export function RowChevron({ className }: { className?: string }) {
  return <ChevronRight aria-hidden className={cn("size-4 shrink-0 text-muted-foreground/60", className)} strokeWidth={2.5} />;
}
