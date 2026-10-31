import { describe, expect, it } from "vitest";
import { clock12, dayFor, dayLong, dayShort, durationLabel, monthFor, timeRange, timeRangeShort, weekdayShort } from "../src/lib/format";

// The one set of forms every screen uses. If one of these changes, every screen changes with it.
describe("how dates and times read", () => {
  it("writes a day the same way with and without the year", () => {
    expect(weekdayShort("2026-10-31")).toBe("Sat");
    expect(dayShort("2026-10-31")).toBe("Sat 31 Oct");
    expect(dayLong("2026-10-31")).toBe("Sat 31 Oct 2026");
  });

  it("adds the year only when the day is not in this year", () => {
    expect(dayFor("2026-12-31", "2026-10-31")).toBe("Thu 31 Dec");
    expect(dayFor("2027-03-14", "2026-10-31")).toBe("Sun 14 Mar 2027");
    expect(dayFor("2025-12-31", "2026-01-01")).toBe("Wed 31 Dec 2025");
  });

  it("names a month, with the year only when it is not this year", () => {
    expect(monthFor("2026-11-03", "2026-10-31")).toBe("November");
    expect(monthFor("2027-01-09", "2026-10-31")).toBe("January 2027");
  });

  it("writes a time of day and a range", () => {
    expect(clock12("06:00")).toBe("6:00 am");
    expect(clock12("12:30")).toBe("12:30 pm");
    expect(clock12("00:15")).toBe("12:15 am");
    expect(timeRange("06:00", "09:00")).toBe("6:00 am to 9:00 am");
    expect(timeRange("19:00", null)).toBe("From 7:00 pm");
    expect(timeRange(null, "09:00")).toBeNull();
  });

  it("writes a short range for list rows", () => {
    expect(timeRangeShort("09:00", "11:00")).toBe("9 to 11 am");
    expect(timeRangeShort("20:00", "22:00")).toBe("8 to 10 pm");
    expect(timeRangeShort("09:30", "11:00")).toBe("9:30 to 11 am");
    expect(timeRangeShort("09:00", "13:00")).toBe("9 am to 1 pm");
    // Past midnight the two times are not the same half of one day, so both keep their am or pm.
    expect(timeRangeShort("10:00", "09:00")).toBe("10 am to 9 am");
    expect(timeRangeShort("19:00", null)).toBe("From 7 pm");
    expect(timeRangeShort(null, "09:00")).toBeNull();
  });

  it("writes a length", () => {
    expect(durationLabel(45)).toBe("45 min");
    expect(durationLabel(120)).toBe("2 h");
    expect(durationLabel(90)).toBe("1 h 30 min");
  });
});
