import { addDays, weekdayShort } from "../../lib/format";
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

/** "Tomorrow" or the weekday of a day on the viewer's calendar. */
export function dayLabel(day: string, viewerZone: string, now: Date): string {
  return day === addDays(todayIn(viewerZone, now), 1) ? "Tomorrow" : weekdayShort(day);
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
