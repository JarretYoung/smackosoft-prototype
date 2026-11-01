/**
 * Time in a named IANA zone, built on Intl so it follows each zone's own clock changes.
 * A session has a zone, and its times are read and written in it, whatever zone the viewer is in.
 * "HH:mm" is a wall clock reading, a date is "YYYY-MM-DD", and an ISO string is an instant.
 */

const formats = new Map<string, Intl.DateTimeFormat>();

function formatIn(zone: string): Intl.DateTimeFormat {
  let format = formats.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
    formats.set(zone, format);
  }
  return format;
}

/** The wall clock in `zone` at an instant. */
function wallAt(zone: string, instant: number) {
  const p = Object.fromEntries(formatIn(zone).formatToParts(instant).map((part) => [part.type, Number(part.value)]));
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute };
}

/** How far the zone's wall clock is ahead of UTC at an instant, in milliseconds. */
function offsetAt(zone: string, instant: number): number {
  const w = wallAt(zone, instant);
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute) - Math.floor(instant / 60_000) * 60_000;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date in `zone`. */
export function todayIn(zone: string, now: Date = new Date()): string {
  return isoToDate(now.toISOString(), zone);
}

/** The date an instant falls on in `zone`. */
export function isoToDate(iso: string, zone: string): string {
  const w = wallAt(zone, Date.parse(iso));
  return `${w.year}-${pad(w.month)}-${pad(w.day)}`;
}

/** The wall clock "HH:mm" an instant shows in `zone`, for a time input. */
export function isoToTime(iso: string, zone: string): string {
  const w = wallAt(zone, Date.parse(iso));
  return `${pad(w.hour)}:${pad(w.minute)}`;
}

/**
 * The instant at which a wall clock in `zone` reads `date` and `time`, or "" when either is missing.
 * A time a clock change skips lands an hour later, and a time it repeats takes its later pass.
 */
export function zonedToIso(date: string, time: string, zone: string): string {
  if (!date || !time || !zone) return "";
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  if (Number.isNaN(wall)) return "";
  // The offset depends on the instant, so settle it in two passes.
  const firstGuess = wall - offsetAt(zone, wall);
  return new Date(wall - offsetAt(zone, firstGuess)).toISOString();
}

/** The same day as `iso` in `zone`, with the wall clock set to `time`. */
export function withTime(iso: string, time: string, zone: string): string {
  return zonedToIso(isoToDate(iso, zone), time, zone);
}

/** True when two zones show the same wall clock at an instant, whatever they are called. */
export function sameClock(a: string, b: string, instant: number): boolean {
  return a === b || offsetAt(a, instant) === offsetAt(b, instant);
}

/** True for a name Intl knows, such as "Asia/Kuala_Lumpur". Anything else would throw if used as a zone. */
export function isZone(name: string): boolean {
  try {
    formatIn(name);
    return true;
  } catch {
    return false;
  }
}

/** Every zone name this runtime knows. */
export function allZones(): string[] {
  return Intl.supportedValuesOf("timeZone");
}

/** What Intl calls a zone at an instant, in one locale and style. */
function nameAt(zone: string, at: Date, timeZoneName: "short" | "shortOffset", locale: string): string {
  const parts = new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName }).formatToParts(at);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
}

/** "UTC+8", "UTC+5:30" or "UTC" for a zone at an instant. */
function offsetName(zone: string, at: Date): string {
  const label = (nameAt(zone, at, "shortOffset", "en-US") || "GMT").replace("GMT", "UTC");
  // Some runtimes say "GMT" and some "GMT+0" for no offset.
  return /^UTC[+-]0(:00)?$/.test(label) ? "UTC" : label;
}

/**
 * "UTC+8" for a zone on a date, so a zone with clock changes reads right for the session's day.
 * Without a date it is the offset now.
 */
export function offsetLabel(zone: string, date?: string): string {
  return offsetName(zone, new Date((date && zonedToIso(date, "12:00", zone)) || Date.now()));
}

/**
 * The short name people use for a zone at an instant: "BST", "PDT", "GMT". Browsers only know these
 * for American and European zones. Anywhere else, such as Kuala Lumpur, it is the offset, "UTC+8",
 * which is still unambiguous.
 */
export function zoneAbbr(zone: string, at: Date): string {
  for (const locale of ["en-US", "en-GB"]) {
    const name = nameAt(zone, at, "short", locale);
    if (/^[A-Z]{2,5}$/.test(name)) return name;
  }
  return offsetName(zone, at);
}

/** "Asia/Kuala_Lumpur" as "Asia". */
export function zoneRegion(zone: string): string {
  return zone.includes("/") ? zone.split("/")[0].replaceAll("_", " ") : "";
}

/**
 * Zones that match what was typed, a city or a region, best first and at most `limit`.
 * "kuala" and "asia/kuala" and "kuala lumpur" all find Asia/Kuala_Lumpur.
 */
export function searchZones(query: string, zones: string[] = allZones(), limit = 30): string[] {
  const q = query.trim().toLowerCase().replaceAll(" ", "_");
  if (!q) return [];
  const matches = zones.filter((zone) => zone.toLowerCase().includes(q));
  const city = (zone: string) => zone.split("/").pop()!.toLowerCase();
  const rank = (zone: string) => (city(zone).startsWith(q) ? 0 : city(zone).includes(q) ? 1 : 2);
  return matches.sort((x, y) => rank(x) - rank(y) || x.localeCompare(y)).slice(0, limit);
}

/** The zone this browser is set to. Only meaningful in the browser. */
export function browserZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** "Asia/Kuala_Lumpur" as "Kuala Lumpur". */
export function zoneCity(zone: string): string {
  return (zone.split("/").pop() ?? zone).replaceAll("_", " ");
}
