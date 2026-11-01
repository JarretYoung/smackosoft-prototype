import { addDays, dayFor } from "../../lib/format";
import { isoToDate, todayIn } from "../../lib/zoned";

export type DayGroup = "past" | "today" | "week" | "later";

type Dated = { date: string; startTime: string | null };

/**
 * The day a session falls on for the viewer: the day of its start on their clock, so a session
 * that starts at 2 am in Kuala Lumpur is still the day before for someone in London. A session with
 * no start time has no clock to move, so its saved date stands.
 */
export function viewerDay(session: Dated, viewerZone: string): string {
  return session.startTime ? isoToDate(session.startTime, viewerZone) : session.date;
}

/**
 * Where a day sits on the viewer's calendar right now. "Today" is today where the viewer is.
 * "week" is the next seven days after today.
 */
export function dayGroup(day: string, viewerZone: string, now: Date): DayGroup {
  const today = todayIn(viewerZone, now);
  if (day < today) return "past";
  if (day === today) return "today";
  return day <= addDays(today, 7) ? "week" : "later";
}

/**
 * The heading over a day in a list: "Sat 31 Oct", with the year when it is not this year, and a word
 * in front for the days either side of today ("Tomorrow · Sun 1 Nov").
 */
export function dayHeading(day: string, viewerZone: string, now: Date): string {
  const today = todayIn(viewerZone, now);
  const text = dayFor(day, today);
  if (day === addDays(today, -1)) return `Yesterday · ${text}`;
  if (day === today) return `Today · ${text}`;
  if (day === addDays(today, 1)) return `Tomorrow · ${text}`;
  return text;
}

/** Sessions that fall on the same day for the viewer, in order. Give it sessions already in day order. */
export function groupByDay<T extends Dated>(sessions: T[], viewerZone: string): { day: string; sessions: T[] }[] {
  const days: { day: string; sessions: T[] }[] = [];
  for (const session of sessions) {
    const day = viewerDay(session, viewerZone);
    const last = days[days.length - 1];
    if (last?.day === day) last.sessions.push(session);
    else days.push({ day, sessions: [session] });
  }
  return days;
}

/** Days that share a month, in order. `month` is "YYYY-MM". Give it days already in order. */
export function groupByMonth<T extends { day: string }>(days: T[]): { month: string; days: T[] }[] {
  const months: { month: string; days: T[] }[] = [];
  for (const d of days) {
    const month = d.day.slice(0, 7);
    const last = months[months.length - 1];
    if (last?.month === month) last.days.push(d);
    else months.push({ month, days: [d] });
  }
  return months;
}

/**
 * Cuts a list of days after the day that reaches `limit` sessions, so a day is never split in two.
 * What follows the cut is for a "Show more" button.
 */
export function splitDays<T>(days: { day: string; sessions: T[] }[], limit: number) {
  let count = 0;
  const cut = days.findIndex((d) => (count += d.sessions.length) >= limit);
  return cut < 0 ? { shown: days, rest: [] } : { shown: days.slice(0, cut + 1), rest: days.slice(cut + 1) };
}

type Timed = { startTime: string | null; endTime: string | null };

/** Earliest start first. A session with no start time goes last. */
export function byStart(a: Timed, b: Timed): number {
  return (a.startTime ?? "9").localeCompare(b.startTime ?? "9");
}

/** Oldest day first, and within a day the earliest start first, on the viewer's calendar. */
export function byViewerDay(viewerZone: string) {
  return (a: Dated & Timed, b: Dated & Timed) =>
    viewerDay(a, viewerZone).localeCompare(viewerDay(b, viewerZone)) || byStart(a, b);
}

/**
 * Today's sessions in start order, led by the one to show big: the one that is running, otherwise
 * the next to start, otherwise the earliest. Nothing is dropped, a session that has ended stays in the list.
 */
export function leadToday<T extends Timed>(sessions: T[], now: Date): T[] {
  const sorted = [...sessions].sort(byStart);
  const t = now.getTime();
  const running = sorted.findIndex((s) => s.startTime && s.endTime && Date.parse(s.startTime) <= t && t < Date.parse(s.endTime));
  const next = sorted.findIndex((s) => s.startTime && Date.parse(s.startTime) > t);
  const lead = running >= 0 ? running : next >= 0 ? next : 0;
  return lead <= 0 ? sorted : [sorted[lead], ...sorted.filter((_, i) => i !== lead)];
}
