import fs from "node:fs";
import { chromium } from "@playwright/test";
import { AUTH_DIR, authFile, DEVICE, MANIFEST, PASSWORD, SHOTS, USERS } from "./device";

/** Start clean, then sign each seeded user in once and keep the session for the flows. */
export default async function globalSetup() {
  // Right after a database reset the app can take a few seconds to answer.
  for (let attempt = 0; attempt < 30; attempt++) {
    const ok = await fetch(`${DEVICE.baseURL}/auth/login`).then((r) => r.ok, () => false);
    if (ok) break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  fs.rmSync(SHOTS, { recursive: true, force: true });
  fs.rmSync(MANIFEST, { force: true });
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.mkdirSync(SHOTS, { recursive: true });

  const browser = await chromium.launch();
  for (const [user, email] of Object.entries(USERS)) {
    const context = await browser.newContext(DEVICE);
    const page = await context.newPage();
    await page.goto("/auth/login");
    // Typing before React has loaded is lost, so wait for the page to settle.
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL(/\/home/, { timeout: 30_000 });
    await context.storageState({ path: authFile(user as keyof typeof USERS) });
    await context.close();
  }
  await browser.close();
}
