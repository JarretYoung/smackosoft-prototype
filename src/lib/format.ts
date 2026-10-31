/**
 * Display helpers. Dates arrive as "YYYY-MM-DD" strings and are shown without timezone shifts.
 * Every screen shows dates and times in these forms and no others, so a session reads the same everywhere:
 *
 *   Time          6:00 am               clock12
 *   Time range    6:00 am to 9:00 am    timeRange (open ended: "From 6:00 am")
 *   Short range   9 to 11 am            timeRangeShort, for list rows
 *   Length        1 h 30 min            durationLabel
 *   Day           Sat 31 Oct            dayShort, the default
 *   Day, year     Sat 31 Oct 2026       dayLong, or dayFor to add the year only when it is not this year
 *   Weekday       Sat                   weekdayShort
 *   Month         November              monthFor, with the year when it is not this year
 *   Date block    SAT over 31 over OCT  weekdayShort, dayOf and monthShort
 *
 * A word where it helps ("Today", "Tomorrow") comes from `dayLabel` in the sessions feature.
 * Times that depend on a timezone come from `src/lib/zoned.ts`.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

/** "3.0906, 101.6063". Four decimals is about ten metres, plenty to tell places apart. */
export function coordinatesShort(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

/** "Wed" */
export function weekdayShort(date: string): string {
  const { year, month, day } = parts(date);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}

/** "Wed 28 Oct" */
export function dayShort(date: string): string {
  const { month, day } = parts(date);
  return `${weekdayShort(date)} ${day} ${MONTHS[month - 1]}`;
}

/** "Wed 28 Oct 2026" */
export function dayLong(date: string): string {
  return `${dayShort(date)} ${parts(date).year}`;
}

/** `dayShort`, with the year added when `date` is not in the same year as `today`. */
export function dayFor(date: string, today: string): string {
  return parts(date).year === parts(today).year ? dayShort(date) : dayLong(date);
}

/** "November", or "November 2027" when `date` is not in the same year as `today`. */
export function monthFor(date: string, today: string): string {
  const { year, month } = parts(date);
  const name = MONTHS_LONG[month - 1];
  return year === parts(today).year ? name : `${name} ${year}`;
}

/** The first day of the month before `date` through the last day of the month after it. */
export function monthWindow(date: string): { from: string; to: string } {
  const { year, month } = parts(date);
  const day = (d: Date) => d.toISOString().slice(0, 10);
  return {
    from: day(new Date(Date.UTC(year, month - 2, 1))),
    to: day(new Date(Date.UTC(year, month + 1, 0))),
  };
}

/** `date` moved by whole calendar days, as "YYYY-MM-DD". Pure date arithmetic, so no zone or clock change matters. */
export function addDays(date: string, days: number): string {
  const { year, month, day } = parts(date);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function dayOf(date: string): string {
  return String(parts(date).day);
}

export function monthShort(date: string): string {
  return MONTHS[parts(date).month - 1].toUpperCase();
}

/** "RM 20" for MYR, otherwise the currency code and amount. */
export function money(amount: number | null, currency: string | null): string | null {
  if (amount == null || !currency) return null;
  const value = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return currency === "MYR" ? `RM ${value}` : `${currency} ${value}`;
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "09:30" to 570 minutes after midnight. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** 570 to "09:30". */
export function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** "09:00" to "9:00 am". */
export function clock12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** "9:00 am to 11:00 am", "From 9:00 am", or null when there is no start. */
export function timeRange(start: string | null, end: string | null): string | null {
  if (!start) return null;
  return end ? `${clock12(start)} to ${clock12(end)}` : `From ${clock12(start)}`;
}

/**
 * The short range for tight rows: "9 to 11 am", "8 to 10 pm", "9 am to 1 pm", "9:30 to 11 am", "From 9 am".
 * The hour drops ":00", and the first time drops its am or pm when the end shares it on the same day.
 */
export function timeRangeShort(start: string | null, end: string | null): string | null {
  if (!start) return null;
  const clock = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const hour = h % 12 === 0 ? 12 : h % 12;
    return { text: m === 0 ? String(hour) : `${hour}:${String(m).padStart(2, "0")}`, meridiem: h < 12 ? "am" : "pm" };
  };
  const from = clock(start);
  if (!end) return `From ${from.text} ${from.meridiem}`;
  const to = clock(end);
  const sameHalf = from.meridiem === to.meridiem && timeToMinutes(end) > timeToMinutes(start);
  return `${sameHalf ? from.text : `${from.text} ${from.meridiem}`} to ${to.text} ${to.meridiem}`;
}

/** 90 to "1 h 30 min", 120 to "2 h", 45 to "45 min". */
export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h && `${h} h`, m && `${m} min`].filter(Boolean).join(" ");
}

