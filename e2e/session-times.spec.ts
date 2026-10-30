import { go, unique } from "./support/app";
import { createSession } from "./support/db";
import { setDate, setTime } from "./support/session-form";
import { expect, test } from "./support/test";
import { addDays, cityOf, clock12, clockIn, dateIn, dayShort, longDate, timeRange, todayIso, zonedIso } from "./support/time";

/**
 * A new session takes the browser's timezone and day, and a session shows its times on its own clock,
 * so these specs run in several browser timezones. Sessions made through the database use that same zone.
 * See the tz-* projects in playwright.config.ts. Every expected text comes from the inputs the test types.
 */

/** A Sunday when the clocks change in each zone, as the test data for the clock change spec. */
const CLOCK_CHANGE_DAY: Record<string, string> = {
  "Asia/Kuala_Lumpur": "2027-03-28", // No clock change here. A control.
  "America/Los_Angeles": "2027-03-14", // Clocks go forward.
  "Europe/London": "2027-03-28", // Clocks go forward.
  "Pacific/Auckland": "2027-04-04", // Clocks go back.
};

/** A zone other than the browser's, with the city the page names it by. */
const AWAY_ZONE: Record<string, { zone: string; city: string }> = {
  "Asia/Kuala_Lumpur": { zone: "Europe/London", city: "London" },
  "America/Los_Angeles": { zone: "Europe/London", city: "London" },
  "Europe/London": { zone: "Asia/Kuala_Lumpur", city: "Kuala Lumpur" },
  "Pacific/Auckland": { zone: "Europe/London", city: "London" },
};

const START = "22:00";
const END = "01:00";

test("a session that ends after midnight shows its time range and the next day", async ({ page, timezoneId }) => {
  const name = `E2e night ${unique()}`;
  const date = todayIso(timezoneId);
  const nextDay = dayShort(addDays(date, 1));

  await go(page, "/sessions/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await setTime(page, "Starts", START);
  await setTime(page, "Ends", END);

  // The form says the end falls on the next day.
  await expect(page.getByRole("button", { name: /^Starts/ })).toContainText(clock12(START));
  await expect(page.getByRole("button", { name: /^Ends/ })).toContainText(`${clock12(END)}, ${nextDay}`);

  await page.getByRole("button", { name: "Create session" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText(timeRange(START, END))).toBeVisible();

  // The saved times come back the same after a reload.
  await page.reload();
  await expect(page.getByText(timeRange(START, END))).toBeVisible();
});

test("a session in another zone shows your clock first and reveals its own", async ({ page, timezoneId }) => {
  const away = AWAY_ZONE[timezoneId!];
  const name = `E2e away ${unique()}`;
  const date = todayIso(away.zone);
  const start = zonedIso(date, "19:00", away.zone);
  const end = zonedIso(date, "21:00", away.zone);
  const sessionId = await createSession({ label: name, date, timezone: away.zone, startTime: start, endTime: end });

  // The page shows the viewer's own clock first. A chip reveals the session's clock, and again goes back.
  const mine = timeRange(clockIn(start, timezoneId!), clockIn(end, timezoneId!));
  await go(page, `/sessions/${sessionId}`);
  await expect(page.getByText(mine)).toBeVisible();
  await page.getByRole("button", { name: `Showing your time. Show ${away.city} time instead.` }).click();
  await expect(page.getByText(timeRange("19:00", "21:00"))).toBeVisible();
  await page.getByRole("button", { name: `Showing ${away.city} time. Show your time instead.` }).click();
  await expect(page.getByText(mine)).toBeVisible();

  // The form names the zone as a row like any other setting.
  await go(page, `/sessions/${sessionId}/edit`);
  await expect(page.getByRole("button", { name: /^Starts/ })).toContainText(clock12("19:00"));
  await expect(page.getByRole("button", { name: /^Time zone/ })).toContainText(away.city);
});

test("the sessions list shows a session on your own clock, wherever it happens", async ({ page, timezoneId }) => {
  const away = AWAY_ZONE[timezoneId!];
  const name = `E2e list ${unique()}`;
  const start = new Date(Date.now() + 3 * 3_600_000).toISOString();
  const end = new Date(Date.now() + 5 * 3_600_000).toISOString();
  await createSession({ label: name, date: dateIn(start, away.zone), timezone: away.zone, startTime: start, endTime: end });

  await go(page, "/sessions");
  await expect(page.getByRole("link", { name: new RegExp(name) })).toContainText(
    timeRange(clockIn(start, timezoneId!), clockIn(end, timezoneId!)),
  );
});

test("changing the zone keeps the times that were typed", async ({ page, timezoneId }) => {
  const away = AWAY_ZONE[timezoneId!];
  const date = todayIso(away.zone);
  const sessionId = await createSession({
    label: `E2e zone ${unique()}`,
    date,
    timezone: away.zone,
    startTime: zonedIso(date, "19:00", away.zone),
    endTime: zonedIso(date, "21:00", away.zone),
  });

  // Pick the browser's own zone, which the sheet offers first.
  await go(page, `/sessions/${sessionId}/edit`);
  await page.getByRole("button", { name: /^Time zone/ }).click();
  await page.getByRole("button", { name: /Your time zone/ }).click();
  await expect(page.getByRole("button", { name: /^Time zone/ })).toContainText(cityOf(timezoneId!));
  await expect(page.getByRole("button", { name: /^Starts/ })).toContainText(clock12("19:00"));
  await page.getByRole("button", { name: "Save changes" }).click();

  // The same clock reading now belongs to this zone, so there is no chip any more.
  await expect(page.getByText(timeRange("19:00", "21:00"))).toBeVisible();
  await expect(page.getByRole("button", { name: /^Showing .* time\./ })).toBeHidden();
});

test("an edited session keeps its new times when you reopen it", async ({ page, timezoneId }) => {
  const name = `E2e edit times ${unique()}`;
  const date = todayIso(timezoneId);
  const sessionId = await createSession({
    label: name,
    date,
    timezone: timezoneId!,
    startTime: zonedIso(date, START, timezoneId!),
    endTime: zonedIso(addDays(date, 1), END, timezoneId!),
  });

  await go(page, `/sessions/${sessionId}/edit`);
  await expect(page.getByRole("button", { name: /^Starts/ })).toContainText(clock12(START));
  await expect(page.getByRole("button", { name: /^Ends/ })).toContainText(`${clock12(END)}, ${dayShort(addDays(date, 1))}`);
  await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();

  // A new end on the same evening: the next day label goes away.
  const newStart = "18:30";
  const newEnd = "20:45";
  await setTime(page, "Starts", newStart);
  await setTime(page, "Ends", newEnd);
  await expect(page.getByRole("button", { name: /^Ends/ })).not.toContainText(dayShort(addDays(date, 1)));
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(timeRange(newStart, newEnd))).toBeVisible();

  await page.reload();
  await expect(page.getByText(timeRange(newStart, newEnd))).toBeVisible();

  await go(page, `/sessions/${sessionId}/edit`);
  await expect(page.getByRole("button", { name: /^Starts/ })).toContainText(clock12(newStart));
  await expect(page.getByRole("button", { name: /^Ends/ })).toContainText(clock12(newEnd));
});

test("a session on the night the clocks change keeps its clock times", async ({ page, timezoneId }) => {
  const day = CLOCK_CHANGE_DAY[timezoneId!];
  expect(day, `No clock change day listed for ${timezoneId}`).toBeTruthy();
  const name = `E2e clocks ${unique()}`;
  const end = "01:30";

  await go(page, "/sessions/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await setDate(page, { from: todayIso(timezoneId), to: day });
  await expect(page.getByRole("button", { name: /^Date/ })).toContainText(longDate(day));
  await setTime(page, "Starts", START);
  await setTime(page, "Ends", end);
  await expect(page.getByRole("button", { name: /^Ends/ })).toContainText(`${clock12(end)}, ${dayShort(addDays(day, 1))}`);

  await page.getByRole("button", { name: "Create session" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText(`${longDate(day)} · ${timeRange(START, end)}`)).toBeVisible();

  await page.reload();
  await expect(page.getByText(`${longDate(day)} · ${timeRange(START, end)}`)).toBeVisible();
});
