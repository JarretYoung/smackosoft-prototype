import { afterEach, describe, expect, it } from "vitest";
import { sessionTimes } from "../src/features/sessions/session-times";
import { addDays, isoToTimeInput, localToIso, monthWindow } from "../src/lib/format";

const original = process.env.TZ;
const inZone = (zone: string) => {
  process.env.TZ = zone;
};
afterEach(() => {
  if (original === undefined) delete process.env.TZ;
  else process.env.TZ = original;
});

// The zone is set per test: Node re-reads TZ when it changes, and a shell variable does not reach the workers on Windows.
describe("session times around a clock change", () => {
  it.each([
    ["Europe/London", "2026-10-25"],
    ["Europe/London", "2026-03-29"],
    ["America/Los_Angeles", "2026-03-08"],
    ["America/Los_Angeles", "2026-11-01"],
    ["Pacific/Auckland", "2026-04-05"],
    ["Australia/Lord_Howe", "2026-10-04"],
  ])("%s on %s: an end past midnight keeps its clock time", (zone, date) => {
    inZone(zone);
    const { startIso, endIso, nextDay } = sessionTimes(date, "23:00", "01:00");
    expect(nextDay).toBe(true);
    expect(isoToTimeInput(startIso)).toBe("23:00");
    expect(isoToTimeInput(endIso)).toBe("01:00");
  });

  it("round trips a time of day in a zone without clock changes", () => {
    inZone("Asia/Kuala_Lumpur");
    expect(isoToTimeInput(localToIso("2026-10-30", "19:30"))).toBe("19:30");
    expect(localToIso("2026-10-30", "19:30")).toBe("2026-10-30T11:30:00.000Z");
  });

  it("moves a date by whole days across a clock change", () => {
    inZone("America/Los_Angeles");
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
  });
});

describe("the calendar window follows the date the page calls today", () => {
  it.each([
    ["2026-11-01", "2026-10-01", "2026-12-31"],
    ["2026-01-15", "2025-12-01", "2026-02-28"],
    ["2026-12-31", "2026-11-01", "2027-01-31"],
    ["2028-01-10", "2027-12-01", "2028-02-29"],
  ])("%s covers %s through %s", (today, from, to) => {
    expect(monthWindow(today)).toEqual({ from, to });
  });
});
