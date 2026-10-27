import { defineConfig } from "@playwright/test";
import { DEVICE, GALLERY } from "./device";
import path from "node:path";

export default defineConfig({
  testDir: GALLERY,
  testMatch: "capture.spec.ts",
  globalSetup: path.join(GALLERY, "global-setup.ts"),
  // One worker, in order: later flows rely on data the earlier ones leave behind.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 120_000,
  reporter: "list",
  outputDir: path.join(GALLERY, ".results"),
  use: { browserName: "chromium", ...DEVICE, trace: "off", screenshot: "off", video: "off" },
});
