import { timeRange } from "../../lib/format";
import { isoToDate, isoToTime } from "../../lib/zoned";

/**
 * A session's day and times as the clock of `on` reads them: its own zone, or the viewer's.
 * The day comes from the start instant, so a viewer whose clock is a day behind sees that day.
 * With no start, the saved date stands, and there is no time to show.
 */
export function whenOn({
  date,
  start,
  end,
  zone,
  on,
}: {
  date: string;
  start: string | null;
  end: string | null;
  zone: string;
  on: string;
}): { day: string; range: string | null } {
  if (!start) return { day: date, range: null };
  return {
    day: on === zone ? date : isoToDate(start, on),
    range: timeRange(isoToTime(start, on), end ? isoToTime(end, on) : null),
  };
}
