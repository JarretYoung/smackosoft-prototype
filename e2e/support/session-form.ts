import { expect, type Page } from "@playwright/test";
import { monthsBetween } from "./time";

/** Open the Starts or Ends sheet, type the time and close it. `time` is "HH:mm". */
export async function setTime(page: Page, which: "Starts" | "Ends", time: string) {
  await page.getByRole("button", { name: new RegExp(`^${which}`) }).click();
  const sheet = page.getByRole("dialog", { name: which });
  await sheet.getByLabel(`Exact time for ${which.toLowerCase()}`).fill(time);
  await sheet.getByRole("button", { name: "Done" }).click();
  await expect(sheet).toBeHidden();
}

/**
 * Open the Date sheet and tap a day. The calendar opens on `from`, the date the form shows now,
 * so the number of month steps follows from the two dates.
 */
export async function setDate(page: Page, { from, to }: { from: string; to: string }) {
  await page.getByRole("button", { name: /^Date/ }).click();
  const sheet = page.getByRole("dialog", { name: "Date" });
  const steps = monthsBetween(from, to);
  const arrow = sheet.getByRole("button", { name: steps > 0 ? "Go to the Next Month" : "Go to the Previous Month" });
  for (let i = 0; i < Math.abs(steps); i++) await arrow.click();

  const [year, month, day] = to.split("-").map(Number);
  const monthName = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  await sheet.getByRole("button", { name: new RegExp(`${monthName} ${day}, ${year}`) }).click();
  await expect(sheet).toBeHidden();
}
