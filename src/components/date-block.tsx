import { dayOf, monthShort, weekdayShort } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";

/** Where a day sits for the viewer. It decides the color. */
export type DateState = "past" | "today" | "upcoming";

/**
 * A day as a small typographic block: the weekday, the day number, the month. The sizes are the ones
 * the date tile kept from c5a788a until the agenda rows: the number a step up at 20 (`text-xl`) and the labels at
 * caption size (11), bold and tracked, 2px apart. The block has no background. For today the column around it is filled
 * red (see `AgendaRows`) and the text turns white. Red is spent by meaning: an upcoming day has a red
 * weekday, a day gone by is gray.
 */
export function DateBlock({ date, state }: { date: string; state: DateState }) {
  const today = state === "today";
  const label = "text-caption leading-none font-bold tracking-wider uppercase";
  return (
    <div className="flex w-12 flex-col items-center gap-0.5 text-center">
      <span
        className={cn(
          label,
          today ? "text-primary-foreground/80" : state === "upcoming" ? "text-primary" : "text-muted-foreground",
        )}
      >
        {weekdayShort(date)}
      </span>
      <span className={cn("score text-xl leading-none", state === "past" && "text-muted-foreground")}>{dayOf(date)}</span>
      <span className={cn(label, today ? "text-primary-foreground/80" : "text-muted-foreground")}>{monthShort(date)}</span>
    </div>
  );
}
