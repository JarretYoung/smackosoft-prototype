import path from "node:path";

/** Run from the repo root, so everything resolves from there. */
export const GALLERY = path.resolve(process.cwd(), "gallery");
export const SHOTS = path.join(GALLERY, "screenshots");
export const AUTH_DIR = path.join(GALLERY, ".auth");
export const MANIFEST = path.join(GALLERY, ".manifest.jsonl");

export const PASSWORD = "Password123";
export const USERS = {
  ian: "ian@smacko.test",
  nadree: "nadree@smacko.test",
} as const;

/** An iPhone sized screen in Chromium. The image is exactly what the phone shows. */
export const DEVICE = {
  baseURL: "http://localhost:3000",
  viewport: { width: 390, height: 844 },
  screen: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  timezoneId: "Asia/Kuala_Lumpur",
  locale: "en-GB",
  colorScheme: "light" as const,
  reducedMotion: "reduce" as const,
};

export const authFile = (user: keyof typeof USERS) => path.join(AUTH_DIR, `${user}.json`);
