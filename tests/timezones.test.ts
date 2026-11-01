import { describe, expect, it } from "vitest";
import { byViewerDay, dayGroup, viewerDay } from "../src/features/sessions/session-days";
import { sessionTimes } from "../src/features/sessions/session-times";
import { addDays, monthWindow } from "../src/lib/format";
import { whenOn } from "../src/features/sessions/when-on";
import {
  allZones,
  isoToDate,
  isoToTime,
  offsetLabel,
  sameClock,
  searchZones,
  todayIn,
  withTime,
  zoneAbbr,
  zoneCity,
  zonedToIso,
  zoneRegion,
} from "../src/lib/zoned";

const KL = "Asia/Kuala_Lumpur";

describe("session times around a clock change", () => {
  it.each([
    ["Europe/London", "2026-10-25"],
    ["Europe/London", "2026-03-29"],
    ["America/Los_Angeles", "2026-03-08"],
    ["America/Los_Angeles", "2026-11-01"],
    ["Pacific/Auckland", "2026-04-05"],
    ["Australia/Lord_Howe", "2026-10-04"],
  ])("%s on %s: an end past midnight keeps its clock time", (zone, date) => {
    const { startIso, endIso, nextDay } = sessionTimes(date, "23:00", "01:00", zone);
    expect(nextDay).toBe(true);
    expect(isoToTime(startIso, zone)).toBe("23:00");
    expect(isoToTime(endIso, zone)).toBe("01:00");
  });

  it("round trips a time of day in a zone without clock changes", () => {
    expect(isoToTime(zonedToIso("2026-10-30", "19:30", KL), KL)).toBe("19:30");
    expect(zonedToIso("2026-10-30", "19:30", KL)).toBe("2026-10-30T11:30:00.000Z");
  });

  it("takes the later pass of a time that happens twice", () => {
    // London turns the clocks back at 02:00 BST on 25 October, so 01:30 is read twice.
    expect(zonedToIso("2026-10-25", "01:30", "Europe/London")).toBe("2026-10-25T01:30:00.000Z");
  });

  it("moves a time that the clocks skip an hour later", () => {
    // London jumps from 01:00 to 02:00 on 29 March, so 01:30 never happens.
    const skipped = zonedToIso("2026-03-29", "01:30", "Europe/London");
    expect(isoToTime(skipped, "Europe/London")).toBe("02:30");
  });

  it("moves a date by whole days across a clock change", () => {
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("changes a time of day and keeps the day on the session's clock", () => {
    // 00:30 in Kuala Lumpur is still the day before in UTC.
    const start = zonedToIso("2026-10-31", "00:30", KL);
    expect(start).toBe("2026-10-30T16:30:00.000Z");
    expect(withTime(start, "09:15", KL)).toBe(zonedToIso("2026-10-31", "09:15", KL));
  });
});

describe("what day it is depends on the zone you ask in", () => {
  const instant = new Date("2026-10-30T20:00:00.000Z");

  it.each([
    [KL, "2026-10-31"],
    ["Europe/London", "2026-10-30"],
    ["America/Los_Angeles", "2026-10-30"],
    ["Pacific/Auckland", "2026-10-31"],
  ])("at 20:00 UTC it is %s on %s", (zone, date) => {
    expect(todayIn(zone, instant)).toBe(date);
    expect(isoToDate(instant.toISOString(), zone)).toBe(date);
  });

  it("calls a day today when it is today for the viewer", () => {
    // Midnight has passed in Kuala Lumpur but not in London.
    expect(dayGroup("2026-10-31", KL, instant)).toBe("today");
    expect(dayGroup("2026-10-31", "Europe/London", instant)).toBe("week");
    expect(dayGroup("2026-10-30", KL, instant)).toBe("past");
  });

  it("splits the days after today into this week and later", () => {
    expect(dayGroup("2026-11-07", KL, instant)).toBe("week");
    expect(dayGroup("2026-11-08", KL, instant)).toBe("later");
  });

  it("puts a session on the day it starts for the viewer, not the day it is saved under", () => {
    // 2 am on 31 October in Kuala Lumpur is still 30 October in London.
    const session = { date: "2026-10-31", startTime: zonedToIso("2026-10-31", "02:00", KL) };
    expect(viewerDay(session, KL)).toBe("2026-10-31");
    expect(viewerDay(session, "Europe/London")).toBe("2026-10-30");
    // With no start time there is no clock to move, so the saved date stands.
    expect(viewerDay({ date: "2026-10-31", startTime: null }, "Europe/London")).toBe("2026-10-31");
  });

  it("orders sessions by the day they fall on for the viewer, then by start", () => {
    const late = { date: "2026-10-31", startTime: zonedToIso("2026-10-31", "20:00", KL), endTime: null };
    const small = { date: "2026-10-31", startTime: zonedToIso("2026-10-31", "02:00", KL), endTime: null };
    const nextDay = { date: "2026-11-01", startTime: zonedToIso("2026-11-01", "09:00", KL), endTime: null };
    // In Kuala Lumpur they run small, late, nextDay. In London the small hours belong to the day before.
    expect([late, nextDay, small].sort(byViewerDay(KL))).toEqual([small, late, nextDay]);
    expect([late, nextDay, small].sort(byViewerDay("Europe/London"))).toEqual([small, late, nextDay]);
    const evening = { date: "2026-10-31", startTime: zonedToIso("2026-10-31", "23:30", KL), endTime: null };
    expect([evening, small].sort(byViewerDay("America/Los_Angeles"))).toEqual([small, evening]);
  });
});

describe("whether two zones are the same clock", () => {
  const winter = Date.parse("2026-01-15T12:00:00Z");
  const summer = Date.parse("2026-07-15T12:00:00Z");

  it("treats differently named zones with the same offset as one clock", () => {
    expect(sameClock(KL, "Asia/Singapore", winter)).toBe(true);
    expect(sameClock(KL, KL, winter)).toBe(true);
  });

  it("tells zones apart, and follows a clock change", () => {
    expect(sameClock(KL, "Europe/London", winter)).toBe(false);
    // London and Dublin agree all year. London and Lisbon agree too, but not London and Paris.
    expect(sameClock("Europe/London", "Europe/Dublin", summer)).toBe(true);
    expect(sameClock("Europe/London", "Europe/Paris", summer)).toBe(false);
    // New York and Toronto change on the same days, New York and Phoenix do not.
    expect(sameClock("America/New_York", "America/Phoenix", winter)).toBe(false);
    expect(sameClock("America/New_York", "America/Phoenix", summer)).toBe(false);
  });
});

describe("naming a zone", () => {
  it("shows the offset on the session's day", () => {
    expect(offsetLabel(KL, "2026-10-31")).toBe("UTC+8");
    expect(offsetLabel("Europe/London", "2026-01-15")).toBe("UTC");
    expect(offsetLabel("Europe/London", "2026-07-15")).toBe("UTC+1");
    expect(offsetLabel("Asia/Kolkata", "2026-10-31")).toBe("UTC+5:30");
  });

  it("finds a zone by city, by region and city, or by words", () => {
    const zones = ["Asia/Kuala_Lumpur", "Asia/Kolkata", "Europe/London", "America/Los_Angeles", "America/Argentina/Buenos_Aires"];
    expect(searchZones("kuala", zones)).toEqual(["Asia/Kuala_Lumpur"]);
    expect(searchZones("asia/k", zones)).toEqual(["Asia/Kolkata", "Asia/Kuala_Lumpur"]);
    expect(searchZones("Kuala Lumpur", zones)).toEqual(["Asia/Kuala_Lumpur"]);
    expect(searchZones("los", zones)).toEqual(["America/Los_Angeles"]);
    expect(searchZones("buenos", zones)).toEqual(["America/Argentina/Buenos_Aires"]);
    expect(searchZones("   ", zones)).toEqual([]);
    expect(searchZones("nowhere", zones)).toEqual([]);
  });

  it("knows the zones the browser offers", () => {
    expect(allZones()).toContain("Asia/Kuala_Lumpur");
  });

  it("shows a city and a region", () => {
    expect(zoneCity("America/Argentina/Buenos_Aires")).toBe("Buenos Aires");
    expect(zoneRegion("Asia/Kuala_Lumpur")).toBe("Asia");
    expect(zoneRegion("UTC")).toBe("");
  });
});

describe("a session's day and times on one clock or another", () => {
  const night = { date: "2026-10-31", zone: KL, start: zonedToIso("2026-10-31", "20:00", KL), end: zonedToIso("2026-10-31", "22:00", KL) };
  const small = { date: "2026-10-31", zone: KL, start: zonedToIso("2026-10-31", "02:00", KL), end: zonedToIso("2026-10-31", "04:00", KL) };

  it("reads the session's own clock with the saved date", () => {
    expect(whenOn({ ...night, on: KL })).toEqual({ day: "2026-10-31", range: "8:00 pm to 10:00 pm" });
  });

  it("reads the viewer's clock, on the same day when the day agrees", () => {
    // 8 pm on Saturday in Kuala Lumpur is 5 am the same Saturday in Los Angeles.
    expect(whenOn({ ...night, on: "America/Los_Angeles" })).toEqual({ day: "2026-10-31", range: "5:00 am to 7:00 am" });
    expect(whenOn({ ...night, on: "Asia/Kolkata" })).toEqual({ day: "2026-10-31", range: "5:30 pm to 7:30 pm" });
  });

  it("moves the day with the clock, so the date and the time never disagree", () => {
    // 2 am on Saturday in Kuala Lumpur is still Friday in Los Angeles and London.
    expect(whenOn({ ...small, on: "America/Los_Angeles" })).toEqual({ day: "2026-10-30", range: "11:00 am to 1:00 pm" });
    expect(whenOn({ ...small, end: null, on: "Europe/London" })).toEqual({ day: "2026-10-30", range: "From 6:00 pm" });
  });

  it("has no time to show for a session with no start", () => {
    expect(whenOn({ date: "2026-10-31", zone: KL, start: null, end: null, on: "Europe/London" })).toEqual({ day: "2026-10-31", range: null });
  });
});

describe("the short name of a zone", () => {
  const winter = new Date("2026-01-15T12:00:00Z");
  const summer = new Date("2026-07-15T12:00:00Z");

  it("uses the abbreviation where the browser knows one, and follows the clock change", () => {
    expect(zoneAbbr("Europe/London", winter)).toBe("GMT");
    expect(zoneAbbr("Europe/London", summer)).toBe("BST");
    expect(zoneAbbr("America/Los_Angeles", winter)).toBe("PST");
    expect(zoneAbbr("America/Los_Angeles", summer)).toBe("PDT");
    expect(zoneAbbr("Europe/Paris", summer)).toBe("CEST");
  });

  it("uses the offset where there is no abbreviation, which is still unambiguous", () => {
    expect(zoneAbbr(KL, summer)).toBe("UTC+8");
    expect(zoneAbbr("Asia/Kolkata", summer)).toBe("UTC+5:30");
    expect(zoneAbbr("UTC", summer)).toBe("UTC");
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
