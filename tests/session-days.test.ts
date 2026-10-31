import { describe, expect, it } from "vitest";
import { dayHeading, groupByDay, leadToday, splitDays } from "../src/features/sessions/session-days";

const at = (hour: number) => `2026-10-31T${String(hour).padStart(2, "0")}:00:00.000Z`;
const session = (name: string, start: number | null, end: number | null) => ({
  name,
  startTime: start === null ? null : at(start),
  endTime: end === null ? null : at(end),
});
const names = (list: { name: string }[]) => list.map((s) => s.name);

describe("today's sessions", () => {
  const morning = session("morning", 1, 3);
  const noon = session("noon", 4, 6);
  const evening = session("evening", 10, 12);
  const undated = session("undated", null, null);

  it("leads with the one that is running, and keeps the rest in start order", () => {
    const list = leadToday([evening, undated, morning, noon], new Date(at(5)));
    expect(names(list)).toEqual(["noon", "morning", "evening", "undated"]);
  });

  it("leads with the next one to start when none is running", () => {
    const list = leadToday([evening, morning, noon], new Date(at(8)));
    expect(names(list)).toEqual(["evening", "morning", "noon"]);
  });

  it("leads with the earliest when everything has ended, and drops nothing", () => {
    const list = leadToday([evening, morning, noon, undated], new Date(at(20)));
    expect(names(list)).toEqual(["morning", "noon", "evening", "undated"]);
  });

  it("leaves a single session alone", () => {
    expect(names(leadToday([noon], new Date(at(5))))).toEqual(["noon"]);
    expect(leadToday([], new Date(at(5)))).toEqual([]);
  });
});

describe("the heading over a day", () => {
  // 20:00 UTC on 30 October is already 31 October in Kuala Lumpur.
  const now = new Date("2026-10-30T20:00:00.000Z");

  it("names the days either side of today on the viewer's calendar", () => {
    expect(dayHeading("2026-10-30", "Asia/Kuala_Lumpur", now)).toBe("Yesterday · Fri 30 Oct");
    expect(dayHeading("2026-10-31", "Asia/Kuala_Lumpur", now)).toBe("Today · Sat 31 Oct");
    expect(dayHeading("2026-11-01", "Asia/Kuala_Lumpur", now)).toBe("Tomorrow · Sun 1 Nov");
    // The same instant is still the 30th in London, so the 31st is tomorrow there.
    expect(dayHeading("2026-10-31", "Europe/London", now)).toBe("Tomorrow · Sat 31 Oct");
  });

  it("is the plain day for other days, with the year only when it is not this year", () => {
    expect(dayHeading("2026-11-03", "Asia/Kuala_Lumpur", now)).toBe("Tue 3 Nov");
    expect(dayHeading("2027-03-14", "Asia/Kuala_Lumpur", now)).toBe("Sun 14 Mar 2027");
  });
});

describe("a list grouped by day", () => {
  const session = (id: string, date: string, startTime: string | null = null) => ({ id, date, startTime });
  const days = (...counts: number[]) => counts.map((n, i) => ({ day: `2026-10-${10 + i}`, sessions: Array.from({ length: n }, (_, k) => k) }));

  it("puts sessions of the same day together, in the order they come", () => {
    const list = [session("a", "2026-10-30"), session("b", "2026-10-30"), session("c", "2026-10-31")];
    expect(groupByDay(list, "Asia/Kuala_Lumpur").map((d) => [d.day, d.sessions.map((s) => s.id)])).toEqual([
      ["2026-10-30", ["a", "b"]],
      ["2026-10-31", ["c"]],
    ]);
  });

  it("groups by the day on the viewer's clock", () => {
    // 2 am on the 31st in Kuala Lumpur is still the 30th in London, so it joins the 30th there.
    const small = session("small", "2026-10-31", "2026-10-30T18:00:00.000Z");
    const list = [session("a", "2026-10-30"), small];
    expect(groupByDay(list, "Asia/Kuala_Lumpur")).toHaveLength(2);
    expect(groupByDay(list, "Europe/London")).toHaveLength(1);
  });

  it("cuts after the day that reaches the limit, and never splits a day", () => {
    const cut = splitDays(days(8, 8, 8, 8), 20);
    expect(cut.shown).toHaveLength(3);
    expect(cut.rest).toHaveLength(1);
    expect(splitDays(days(5, 5), 20)).toEqual({ shown: days(5, 5), rest: [] });
    expect(splitDays(days(20, 3), 20).shown).toHaveLength(1);
  });
});
