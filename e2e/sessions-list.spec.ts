import { go, unique } from "./support/app";
import { createSession } from "./support/db";
import { expect, test } from "./support/test";
import { todayIso } from "./support/time";

const KUALA_LUMPUR = "Asia/Kuala_Lumpur";
const HOUR = 3_600_000;

test("a session that has already ended stays under Today", async ({ page }) => {
  const ended = `E2e ended ${unique()}`;
  const coming = `E2e coming ${unique()}`;
  const date = todayIso(KUALA_LUMPUR);
  await createSession({
    label: ended,
    date,
    timezone: KUALA_LUMPUR,
    startTime: new Date(Date.now() - 4 * HOUR).toISOString(),
    endTime: new Date(Date.now() - 2 * HOUR).toISOString(),
  });
  await createSession({
    label: coming,
    date,
    timezone: KUALA_LUMPUR,
    startTime: new Date(Date.now() + 2 * HOUR).toISOString(),
    endTime: new Date(Date.now() + 4 * HOUR).toISOString(),
  });

  await go(page, "/sessions");
  const today = page.getByRole("region", { name: "Today" });
  await expect(today.getByText(ended)).toBeVisible();
  await expect(today.getByText(coming)).toBeVisible();
});
