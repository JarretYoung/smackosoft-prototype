"use client";

import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { dayLong } from "@/src/lib/format";
import { sameClock, zoneAbbr, zoneCity } from "@/src/lib/zoned";
import { cn } from "@/src/lib/utils";
import { whenOn } from "./when-on";

/**
 * The day and times of a session on the viewer's own clock. For a session that happens on a
 * different clock a chip appears: it says "Your time", and a tap switches to the session's own
 * clock, named by its short zone name ("GMT"), and back. The date moves with the time. The chip is
 * not there when the clocks agree, so most sessions show a plain line.
 */
export function SessionWhen({
  date,
  start,
  end,
  zone,
  viewerZone,
  className,
}: {
  date: string;
  start: string | null;
  end: string | null;
  /** Where the session happens. */
  zone: string;
  viewerZone: string;
  className?: string;
}) {
  const [mine, setMine] = useState(true);
  const differs = !!start && !sameClock(zone, viewerZone, Date.parse(start));
  const showMine = !differs || mine;
  const { day, range } = whenOn({ date, start, end, zone, on: showMine ? viewerZone : zone });

  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      <span>
        {dayLong(day)}
        {range && ` · ${range}`}
      </span>
      {differs && (
        <button
          type="button"
          onClick={() => setMine(!mine)}
          aria-label={
            showMine
              ? `Showing your time. Show ${zoneCity(zone)} time instead.`
              : `Showing ${zoneCity(zone)} time. Show your time instead.`
          }
          className="pressable relative inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-footnote font-bold after:absolute after:-inset-2 after:content-['']"
        >
          {showMine ? "Your time" : zoneAbbr(zone, new Date(start))}
          <ArrowLeftRight className="size-3" aria-hidden />
        </button>
      )}
    </p>
  );
}
