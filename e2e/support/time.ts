/**
 * Expected texts for the session time specs, built from the same inputs the test types.
 * They use Intl on purpose and do not import the app's formatters, so a formatting bug in the app fails the test.
 */

const parts = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
};

/** Today as "YYYY-MM-DD" on the machine that runs the app and the tests. */
export const todayIso = () => new Date().toLocaleDateString("en-CA");

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

/** "2026-10-31" as "31 Oct 2026". */
export function longDate(iso: string): string {
  const { year, month, day } = parts(iso);
  const monthName = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  return `${day} ${monthName} ${year}`;
}

/** Whole months from one date to another, ignoring the day. Negative when `to` is earlier. */
export function monthsBetween(from: string, to: string): number {
  const a = parts(from);
  const b = parts(to);
  return (b.year - a.year) * 12 + (b.month - a.month);
}
