"use client";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import { TapeRuler } from "@/src/components/tape-ruler";
import { clock12, minutesToTime, timeToMinutes } from "@/src/lib/format";
import { ChipGroup, type Chip } from "./chip-group";

const DAY = 24 * 60;

/** 7 pm for a whole hour on the tape. Past midnight the clock starts over. */
const hourLabel = (minutes: number) => clock12(minutesToTime(minutes % DAY)).replace(":00", "");

/** Chips of times, from "HH:mm" strings. */
export const timeChips = (times: string[]): Chip<string>[] => times.map((time) => ({ value: time, label: clock12(time) }));

/**
 * Pick a time of day: tap a chip, drag the tape, or type it. It serves any time in the form
 * (start, end), so the caller says what it is for. Every change applies at once, Done only closes.
 * The tape snaps to a quarter hour. The exact field is the precise fallback (on a phone it opens the system wheel).
 * The tape counts minutes from midnight of the session day. When it runs past midnight (`max` over a day),
 * the caller marks where the next day starts, and the time shows as "next day" while it sits after that.
 */
export function TimeSheet({
  open,
  onOpenChange,
  title,
  value,
  onChange,
  quick,
  restAt,
  min = 0,
  max = DAY - 15,
  marks,
  nextDay = false,
  nextDayLabel,
  hint,
  clearLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the time is for, such as "Starts". */
  title: string;
  /** Local "HH:mm", or "" when not set. */
  value: string;
  onChange: (time: string) => void;
  /** One tap times. */
  quick: Chip<string>[];
  /** Where the tape rests while nothing is set, in minutes from midnight of the session day. */
  restAt: number;
  /** The tape range in minutes from midnight of the session day. Default is the one day. */
  min?: number;
  max?: number;
  /** Where a new day starts on the tape, such as the next date. */
  marks?: { at: number; label: string }[];
  /** True when the time is on the day after the session day. */
  nextDay?: boolean;
  /** The date of that next day. */
  nextDayLabel?: string;
  /** A line under the readout, such as how long the session runs. */
  hint?: string;
  /** The button that empties the time, such as "No start time". */
  clearLabel: string;
}) {
  const minutes = value === "" ? null : timeToMinutes(value);
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const onTape = clamp(minutes === null ? restAt : minutes + (nextDay ? DAY : 0));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader className="pb-0">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="sr-only">Pick a time, drag the tape, or type it</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-5 pb-6">
          <div className="text-center" aria-live="polite">
            <p className="text-4xl font-bold tracking-tight tabular-nums">{minutes === null ? "Not set" : clock12(value)}</p>
            {/* One line, always there, so the sheet does not jump when the tape crosses midnight. */}
            <div className="mt-1 flex min-h-6 items-center justify-center gap-2 text-sm text-muted-foreground">
              {nextDay && nextDayLabel && <Badge variant="tinted">Next day, {nextDayLabel}</Badge>}
              {hint && <span>{hint}</span>}
            </div>
          </div>

          <ChipGroup label="Common times" value={value} options={quick} onChange={onChange} />

          <TapeRuler
            value={onTape}
            onChange={(m) => onChange(minutesToTime(m % DAY))}
            min={min}
            max={max}
            pxPerUnit={1.5}
            tickEvery={15}
            majorEvery={60}
            step={15}
            bigStep={60}
            formatTick={hourLabel}
            marks={marks}
            ariaLabel={title}
            valueText={minutes === null ? "Not set" : nextDay && nextDayLabel ? `${clock12(value)}, ${nextDayLabel}` : clock12(value)}
            className="h-20"
          />

          <Input
            type="time"
            aria-label={`Exact time for ${title.toLowerCase()}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="text-center font-semibold tabular-nums"
          />

          <div className="flex flex-col gap-2">
            <Button type="button" size="lg" onClick={() => onOpenChange(false)}>
              Done
            </Button>
            {value !== "" && (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => {
                  onChange("");
                  onOpenChange(false);
                }}
              >
                {clearLabel}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
