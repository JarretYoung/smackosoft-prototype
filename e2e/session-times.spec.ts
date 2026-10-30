import { go, unique } from "./support/app";
import { createSession } from "./support/db";
import { setDate, setTime } from "./support/session-form";
import { expect, test } from "./support/test";
import { addDays, clock12, dayShort, longDate, timeRange, todayIso, zonedIso } from "./support/time";

/**
 * The session times are the browser's local time, so these specs run in several timezones.
 * See the tz-* projects in playwright.config.ts. Every expected text comes from the inputs the test types.
 */

/** A Sunday when the clocks change in each zone, as the test data for the clock change spec. */
const CLOCK_CHANGE_DAY: Record<string, string> = {
  "Asia/Kuala_Lumpur": "2027-03-28", // No clock change here. A control.
  "America/Los_Angeles": "2027-03-14", // Clocks go forward.
  "Europe/London": "2027-03-28", // Clocks go forward.
  "Pacific/Auckland": "2027-04-04", // Clocks go back.
};

const START = "22:00";
const END = "01:00";

test("a session that ends after midnight shows its time range and the next day", async ({ page }) => {
  const name = `E2e night ${unique()}`;
  const date = todayIso();
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

test("an edited session keeps its new times when you reopen it", async ({ page, timezoneId }) => {
  const name = `E2e edit times ${unique()}`;
  const date = todayIso();
  const sessionId = await createSession({
    label: name,
    date,
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
  await setDate(page, { from: todayIso(), to: day });
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
