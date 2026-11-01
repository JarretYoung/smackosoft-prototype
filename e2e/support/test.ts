import { expect, test as base } from "@playwright/test";
import { onboard, signUp, STRONG_PASSWORD, unique } from "./app";
import { confirmationLinkFor } from "./mailpit";

/**
 * Console messages that are not app bugs. Each entry says why. Never add hydration or React warnings here.
 */
const HARMLESS_CONSOLE: { pattern: RegExp; why: string }[] = [
  {
    // Chrome reports every 4xx response it loads as a console error. A test that opens a page that
    // is meant to answer 404 (a not-found screen) would fail on it. 5xx is still caught below.
    pattern: /^Failed to load resource: the server responded with a status of 4\d\d/,
    why: "Browser echo of an expected 4xx response",
  },
];

/** A person who signed up and finished onboarding during this test. */
export type NewUser = { email: string; password: string; name: string; handle: string };

/**
 * Shared setup for the specs.
 * - failOnBrowserErrors (automatic): the test fails on a browser console error, an uncaught page
 *   error or a same-origin 5xx response.
 * - newUser: a person nobody else uses, signed up, confirmed by email and onboarded in a separate
 *   browser context. The test's own page stays signed out.
 */
export const test = base.extend<{ failOnBrowserErrors: void; newUser: NewUser }>({
  failOnBrowserErrors: [
    async ({ context, baseURL }, provide) => {
      const problems: string[] = [];
      const origin = new URL(baseURL ?? "http://127.0.0.1:3000").origin;

      context.on("console", (message) => {
        if (message.type() !== "error") return;
        const text = message.text();
        if (HARMLESS_CONSOLE.some(({ pattern }) => pattern.test(text))) return;
        problems.push(`console.error: ${text} (${message.location().url})`);
      });
      context.on("weberror", (webError) => {
        problems.push(`uncaught page error: ${webError.error().message}`);
      });
      context.on("response", (response) => {
        if (response.status() >= 500 && response.url().startsWith(origin)) {
          problems.push(`HTTP ${response.status()} for ${response.request().method()} ${response.url()}`);
        }
      });

      await provide();

      expect(problems, "The browser reported errors").toStrictEqual([]);
    },
    { auto: true },
  ],

  newUser: async ({ browser, baseURL }, provide) => {
    const id = unique();
    const user: NewUser = { email: `e2e-${id}@smacko.test`, password: STRONG_PASSWORD, name: `E2e ${id}`, handle: `e2e${id}` };

    const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
    try {
      const page = await context.newPage();
      await signUp(page, user);
      await page.goto(await confirmationLinkFor(user.email));
      await expect(page).toHaveURL(/\/onboarding/);
      await onboard(page, user);
    } finally {
      await context.close();
    }

    await provide(user);
  },
});

export { expect };
