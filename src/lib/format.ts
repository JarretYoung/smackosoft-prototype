/** Display helpers. Dates arrive as "YYYY-MM-DD" strings and are shown without timezone shifts. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

/** Today as "YYYY-MM-DD" in the server's local time. */
export function today(): string {
  return new Date().toLocaleDateString("en-CA");
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

/** The same day as `iso` with the local time set to "HH:mm". */
export function timeInputToIso(iso: string, time: string): string {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(iso);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

