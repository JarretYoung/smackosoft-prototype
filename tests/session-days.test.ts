import { describe, expect, it } from "vitest";
import { dayLabel, leadToday } from "../src/features/sessions/session-days";

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

describe("the day a row shows", () => {
  // 20:00 UTC on 30 October is already 31 October in Kuala Lumpur.
  const now = new Date("2026-10-30T20:00:00.000Z");

  it("says Tomorrow for the next day on the session's own calendar", () => {
    expect(dayLabel("2026-11-01", "Asia/Kuala_Lumpur", now)).toBe("Tomorrow");
    expect(dayLabel("2026-10-31", "Europe/London", now)).toBe("Tomorrow");
  });

  it("says the weekday for later days", () => {
    expect(dayLabel("2026-11-03", "Asia/Kuala_Lumpur", now)).toBe("Tue");
    expect(dayLabel("2026-11-06", "Europe/London", now)).toBe("Fri");
  });
});
