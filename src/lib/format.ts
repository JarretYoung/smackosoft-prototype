/** Display helpers. Dates arrive as "YYYY-MM-DD" strings and are shown without timezone shifts. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

/** "3.0906, 101.6063". Four decimals is about ten metres, plenty to tell places apart. */
export function coordinatesShort(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

/** "Wed 28 Oct" */
export function dayShort(date: string): string {
  const { year, month, day } = parts(date);
  const weekday = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  return `${weekday} ${day} ${MONTHS[month - 1]}`;
}

/** "Wed, 28 Oct 2026" */
export function weekdayDate(date: string): string {
  const { year, month, day } = parts(date);
  const weekday = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  return `${weekday}, ${longDate(date)}`;
}

/** Today as "YYYY-MM-DD" in the server's local time. */
export function today(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** `date` moved by `days`, as "YYYY-MM-DD". */
export function addDays(date: string, days: number): string {
  const { year, month, day } = parts(date);
  return new Date(year, month - 1, day + days).toLocaleDateString("en-CA");
}

export function dayOf(date: string): string {
  return String(parts(date).day);
}

export function monthShort(date: string): string {
  return MONTHS[parts(date).month - 1].toUpperCase();
}

/** "3 Oct 2026" */
export function longDate(date: string): string {
  const { year, month, day } = parts(date);
  return `${day} ${MONTHS[month - 1]} ${year}`;
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

/** The local "HH:mm" of an ISO timestamp, for a time input. */
export function isoToTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** The instant for a local "YYYY-MM-DD" date and "HH:mm" time, in the browser's timezone. */
export function localToIso(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [h, m] = time.split(":").map(Number);
  const d = new Date(year, month - 1, day, h, m);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/** 90 to "1 h 30 min", 120 to "2 h", 45 to "45 min". */
export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h && `${h} h`, m && `${m} min`].filter(Boolean).join(" ");
}

/** The same day as `iso` with the local time set to "HH:mm". */
export function timeInputToIso(iso: string, time: string): string {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(iso);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

