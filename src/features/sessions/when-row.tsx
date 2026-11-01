"use client";

import { ArrowLeftRight, Clock } from "lucide-react";
import { useState } from "react";
import { dayFor } from "@/src/lib/format";
import { sameClock, zoneAbbr, zoneCity } from "@/src/lib/zoned";
import { RowIcon } from "./fact-row";
import { whenOn } from "./when-on";

/**
 * The first row of a session's details: the day, and the times in bold, on the viewer's own clock.
 * For a session that happens on a different clock a chip sits at the end of the row. It says "Your
 * time", and a tap switches to the session's clock, named by its short zone name ("GMT"), and back.
 * The day moves with the time. The chip is not there when the clocks agree.
 */
export function WhenRow({
  date,
  start,
  end,
  zone,
  viewerZone,
  today,
}: {
  date: string;
  start: string | null;
  end: string | null;
  /** Where the session happens. */
  zone: string;
  viewerZone: string;
  /** The viewer's today, so the year shows only when it is not this year. */
  today: string;
}) {
  const [mine, setMine] = useState(true);
  const differs = !!start && !sameClock(zone, viewerZone, Date.parse(start));
  const showMine = !differs || mine;
  const { day, range } = whenOn({ date, start, end, zone, on: showMine ? viewerZone : zone });

  return (
    <div className="list-row">
      <RowIcon>
        <Clock />
      </RowIcon>
      <div className="min-w-0 flex-1">
        <p className="text-footnote text-muted-foreground">{dayFor(day, today)}</p>
        <p className="mt-0.5 truncate text-body font-semibold">
          {range ?? <span className="font-normal text-muted-foreground">No time set</span>}
        </p>
      </div>
      {differs && start && (
        <button
          type="button"
          onClick={() => setMine(!mine)}
          aria-label={
            showMine
              ? `Showing your time. Show ${zoneCity(zone)} time instead.`
              : `Showing ${zoneCity(zone)} time. Show your time instead.`
          }
          className="pressable relative inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-footnote font-semibold text-accent-foreground after:absolute after:-inset-2 after:content-['']"
        >
          {showMine ? "Your time" : zoneAbbr(zone, new Date(start))}
          <ArrowLeftRight className="size-3" aria-hidden />
        </button>
      )}
    </div>
  );
}
