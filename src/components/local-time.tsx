"use client";

import { clock12, isoToTimeInput, timeRange } from "@/src/lib/format";
import { useHydrated } from "@/src/hooks/use-hydrated";

/**
 * "9:00 am to 11:00 am" in the viewer's timezone, or nothing when there is no start.
 * The server does not know the viewer's timezone, so this renders after mount.
 * `prefix` and `suffix` are added only when there is a time to show.
 * `startOnly` shows just "9:00 am".
 */
export function LocalTimeRange({
  start,
  end,
  startOnly = false,
  prefix = "",
  suffix = "",
}: {
  start: string | null;
  end?: string | null;
  startOnly?: boolean;
  prefix?: string;
  suffix?: string;
}) {
  const hydrated = useHydrated();
  if (!hydrated || !start) return null;
  const from = isoToTimeInput(start);
  const text = startOnly ? clock12(from) : timeRange(from, end ? isoToTimeInput(end) : null);
  return text ? `${prefix}${text}${suffix}` : null;
}
