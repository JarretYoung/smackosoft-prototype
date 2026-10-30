import { addDays, localToIso, minutesToTime, timeToMinutes } from "../../lib/format";

export const DAY = 24 * 60;

/** Common start times for an evening or morning game. Not taken from history. */
export const START_TIMES = ["07:00", "09:00", "18:00", "19:00", "20:00", "21:00"];
export const END_TIMES = ["09:00", "11:00", "20:00", "21:00", "22:00", "23:00"];
/** Session lengths offered as end times once there is a start, in minutes. */
const END_AFTER = [60, 90, 120, 150, 180];

/**
 * The instants for the local "HH:mm" start and end on a date. An end earlier than the start is the
 * next day, so a game can run past midnight. `runMinutes` is how long it runs, when both are set.
 */
export function sessionTimes(date: string, start: string, end: string) {
  const startIso = start === "" ? "" : localToIso(date, start);
  const endSameDay = end === "" ? "" : localToIso(date, end);
  const nextDay = !!startIso && !!endSameDay && Date.parse(endSameDay) < Date.parse(startIso);
  // The next calendar day, not 24 hours later: a clock change makes the two differ by an hour.
  const endIso = nextDay ? localToIso(addDays(date, 1), end) : endSameDay;
  const runMinutes = start && end ? (timeToMinutes(end) - timeToMinutes(start) + DAY) % DAY : null;
  return { startIso, endIso, nextDay, runMinutes };
}

/** The end times to offer: common lengths after the start, or fixed times without one. */
export function endSuggestions(start: string): string[] {
  if (!start) return END_TIMES;
  return END_AFTER.map((m) => minutesToTime((timeToMinutes(start) + m) % DAY));
}

/**
 * The end tape in minutes from midnight of the session day. With a start it covers the 24 hours
 * after it, so every spot is one real date and time.
 */
export function endTape(start: string) {
  if (!start) return { restAt: 21 * 60, min: undefined, max: undefined, spansNextDay: false };
  const from = timeToMinutes(start);
  return { restAt: from + 120, min: from + 15, max: from + DAY - 15, spansNextDay: true };
}
