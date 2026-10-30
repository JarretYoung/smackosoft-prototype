import { clock12, timeRange } from "@/src/lib/format";
import { isoToTime } from "@/src/lib/zoned";

/**
 * "9:00 am to 11:00 am" as the clock reads in `zone`, or nothing when there is no start. Pass the
 * viewer's zone to show times on their own clock. The server knows it from the timezone cookie, so
 * the server renders the same text as the browser and nobody waits for a mount.
 * `prefix` and `suffix` are added only when there is a time to show.
 * `startOnly` shows just "9:00 am".
 */
export function TimeRange({
  start,
  end,
  zone,
  startOnly = false,
  prefix = "",
  suffix = "",
}: {
  start: string | null;
  end?: string | null;
  zone: string;
  startOnly?: boolean;
  prefix?: string;
  suffix?: string;
}) {
  if (!start) return null;
  const from = isoToTime(start, zone);
  const text = startOnly ? clock12(from) : timeRange(from, end ? isoToTime(end, zone) : null);
  return text ? `${prefix}${text}${suffix}` : null;
}
