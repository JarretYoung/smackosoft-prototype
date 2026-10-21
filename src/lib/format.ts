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
