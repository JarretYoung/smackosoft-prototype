"use client";

import { useRef, useState, type Ref } from "react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import { TapeRuler } from "@/src/components/tape-ruler";
import { cn } from "@/src/lib/utils";
import { clock12, minutesToTime, parseTime, timeToMinutes } from "@/src/lib/format";
import { ChipGroup, type Chip } from "./chip-group";

const DAY = 24 * 60;

/** 7 pm for a whole hour on the tape. Past midnight the clock starts over. */
const hourLabel = (minutes: number) => clock12(minutesToTime(minutes % DAY)).replace(":00", "");

/** Chips of times, from "HH:mm" strings. */
export const timeChips = (times: string[]): Chip<string>[] => times.map((time) => ({ value: time, label: clock12(time) }));

/**
 * Pick a time of day: tap a chip, drag the tape, or type it. It serves any time in the form
 * (start, end), so the caller says what it is for. Every change applies at once, Done only closes.
 * The tape snaps to a quarter hour. The big readout is the exact field: type "10" or "10pm" and it settles to "10:00 am" on blur.
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
  const fieldRef = useRef<HTMLInputElement>(null);
  const minutes = value === "" ? null : timeToMinutes(value);
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const onTape = clamp(minutes === null ? restAt : minutes + (nextDay ? DAY : 0));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="overflow-y-auto"
        onOpenAutoFocus={(e) => {
          // A mouse and keyboard can type at once. On a phone the keyboard would cover the chips and the tape, so wait for a tap.
          e.preventDefault();
          if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) fieldRef.current?.focus();
        }}
      >
        <SheetHeader className="pb-0">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="sr-only">Pick a time, drag the tape, or type it</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-5 pb-6">
          <div className="text-center">
            <TimeField ref={fieldRef} value={value} label={`Exact time for ${title.toLowerCase()}`} onChange={onChange} onEnterIdle={() => onOpenChange(false)}>
              {nextDay && nextDayLabel && <Badge variant="tinted">Next day, {nextDayLabel}</Badge>}
              {hint && <span>{hint}</span>}
            </TimeField>
            <span className="sr-only" aria-live="polite">
              {minutes === null ? "Not set" : clock12(value)}
            </span>
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

          <div className="flex flex-col gap-2">
            <Button type="button" size="lg" onClick={() => onOpenChange(false)}>
              Done
            </Button>
            {/* Hidden, not removed, while there is no time: the first time settles on blur, and a sheet that grows then moves Done out from under the pointer. */}
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className={value === "" ? "invisible" : undefined}
              onClick={() => {
                onChange("");
                onOpenChange(false);
              }}
            >
              {clearLabel}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * The big readout, and a text field. Type any form `parseTime` reads. On blur or Enter it settles to the clock form
 * ("10" becomes "10:00 am") and you edit that to correct it. Text that is not a time stays, marked, so it is never lost silently.
 * Enter with nothing to settle closes the sheet.
 */
function TimeField({
  ref,
  value,
  label,
  onChange,
  onEnterIdle,
  children,
}: {
  ref: Ref<HTMLInputElement>;
  /** Local "HH:mm", or "" when not set. */
  value: string;
  label: string;
  onChange: (time: string) => void;
  onEnterIdle: () => void;
  /** The line under the field while the text is fine. */
  children: React.ReactNode;
}) {
  // The text being typed, or null while the field shows the saved time.
  const [draft, setDraft] = useState<string | null>(null);
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    // The time changed from outside (a chip or the tape), so drop what was half typed.
    setSeen(value);
    setDraft(null);
  }
  const invalid = draft !== null && draft.trim() !== "" && parseTime(draft) === null;

  /** Returns true when there was something to settle. */
  const settle = () => {
    if (draft === null) return false;
    const time = parseTime(draft);
    if (time !== null) onChange(time);
    // An empty field goes back to the saved time. Clearing has its own button.
    if (time !== null || draft.trim() === "") setDraft(null);
    return true;
  };

  return (
    <>
      <input
        ref={ref}
        type="text"
        inputMode="text"
        enterKeyHint="done"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby="time-field-help"
        placeholder="Not set"
        value={draft ?? (value === "" ? "" : clock12(value))}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={settle}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (!settle()) onEnterIdle();
        }}
        className={cn(
          "score mx-auto block w-48 min-w-0 rounded-xl bg-input px-3 py-1 text-center text-3xl text-foreground outline-none transition-[background-color,box-shadow] selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground",
          "focus-visible:bg-card focus-visible:ring-[3px] focus-visible:ring-ring aria-invalid:ring-[3px] aria-invalid:ring-destructive/40",
        )}
      />
      {/* One line, always there, so the sheet does not jump when the tape crosses midnight or a typo shows. */}
      <div id="time-field-help" className="mt-1 flex min-h-6 items-center justify-center gap-2 text-sm text-muted-foreground">
        {invalid ? <span className="text-destructive">Try 10am or 22:00</span> : children}
      </div>
    </>
  );
}
