"use client";

import { useHydrated } from "@/src/hooks/use-hydrated";
import { browserZone, sameClock, zoneAbbr, zoneCity } from "@/src/lib/zoned";

/**
 * "Times are on London time (BST)", for a screen that edits times and has no single time to tag.
 * Nothing shows to someone on the session's clock, and nothing on the server.
 * `at` is an instant on the session's day, so a clock change is judged right.
 */
export function ZoneNote({ zone, at, className }: { zone: string; at: string; className?: string }) {
  const hydrated = useHydrated();
  if (!hydrated || !zone || sameClock(zone, browserZone(), Date.parse(at))) return null;
  return (
    <p className={className}>
      Times are on {zoneCity(zone)} time ({zoneAbbr(zone, new Date(at))})
    </p>
  );
}
