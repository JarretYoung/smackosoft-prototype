import { cn } from "@/src/lib/utils";
import { dayOf, monthShort } from "@/src/lib/format";

/**
 * Calendar tile for list rows. Red while the date is ahead, gray once it is past.
 * Both lines use leading-none so the pair sits in the optical middle, and the month
 * pads its left by the letter spacing so the trailing gap does not push it off center.
 */
export function DateTile({ date, past = false, className }: { date: string; past?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "flex size-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg",
        past ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
        className,
      )}
    >
      <span className="score text-lg leading-none">{dayOf(date)}</span>
      <span className="pl-[0.08em] text-caption leading-none font-bold tracking-wider uppercase">{monthShort(date)}</span>
    </div>
  );
}
