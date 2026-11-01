/**
 * Expected texts for the session time specs, built from the same inputs the test types.
 * They use Intl on purpose and do not import the app's formatters, so a formatting bug in the app fails the test.
 */

const parts = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
};

/** Today as "YYYY-MM-DD" in `timeZone`, or on the machine that runs the app and the tests. */
export const todayIso = (timeZone?: string) => new Date().toLocaleDateString("en-CA", { timeZone });

/** `iso` moved by whole calendar days. */
export function addDays(iso: string, days: number): string {
  const { year, month, day } = parts(iso);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** The UTC instant at which a wall clock in `timeZone` reads `iso` and `time` ("HH:mm"), as an ISO string. */
export function zonedIso(iso: string, time: string, timeZone: string): string {
  const { year, month, day } = parts(iso);
  const [h, m] = time.split(":").map(Number);
  const wall = Date.UTC(year, month - 1, day, h, m);
  const zoneFormat = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
  const offsetAt = (instant: number) => {
    const p = Object.fromEntries(zoneFormat.formatToParts(instant).map((part) => [part.type, Number(part.value)]));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(instant / 60_000) * 60_000;
  };
  // The offset depends on the instant, so settle it in two passes.
  const firstGuess = wall - offsetAt(wall);
  return new Date(wall - offsetAt(firstGuess)).toISOString();
}

/** The wall clock "HH:mm" that an instant shows in `timeZone`. */
export function clockIn(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

/** The date "YYYY-MM-DD" that an instant falls on in `timeZone`. */
export function dateIn(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone });
}

/** "Asia/Kuala_Lumpur" as "Kuala Lumpur", the way the app names a zone. */
export function cityOf(timeZone: string): string {
  return timeZone.split("/").pop()!.replaceAll("_", " ");
}

/** "22:00" as "10:00 pm". */
export function clock12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const text = new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return text.replace(/\s?([AP])M$/, (_, letter: string) => ` ${letter.toLowerCase()}m`);
}

/** "22:00" and "01:00" as "10:00 pm to 1:00 am". */
export const timeRange = (start: string, end: string) => `${clock12(start)} to ${clock12(end)}`;

/** "2026-10-31" as "Sat 31 Oct". */
export function dayShort(iso: string): string {
  const { year, month, day } = parts(iso);
  const at = new Date(Date.UTC(year, month - 1, day));
  const weekday = at.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  const monthName = at.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  return `${weekday} ${day} ${monthName}`;
}

/** Whole months from one date to another, ignoring the day. Negative when `to` is earlier. */
export function monthsBetween(from: string, to: string): number {
  const a = parts(from);
  const b = parts(to);
  return (b.year - a.year) * 12 + (b.month - a.month);
}
