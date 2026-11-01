/** The farthest a sync point can be from the start of a video, in seconds. */
export const OFFSET_LIMIT = 30 * 60;

/**
 * How many steps of the sync ruler make a second. YouTube does not tell us a video's frame rate, so the
 * step is a 30th of a second: one frame for 30 fps video, close to one for 24 and 25 fps, two for 60 fps.
 */
export const FRAMES_PER_SECOND = 30;

/** Sync points are kept to the millisecond, so a number from the player or a ruler step has no float tail. */
export const roundOffset = (seconds: number) => Math.round(seconds * 1000) / 1000;

/** 10 as "0:10", 10.033 as "0:10.03", -5 as "-0:05", 62 as "1:02". Hundredths show only when there are some. */
export function formatOffset(seconds: number): string {
  const hundredths = Math.round(Math.abs(seconds) * 100);
  const whole = Math.floor(hundredths / 100);
  const fraction = hundredths % 100;
  const m = Math.floor(whole / 60);
  const s = String(whole % 60).padStart(2, "0");
  const sign = seconds < 0 && hundredths > 0 ? "-" : "";
  return `${sign}${m}:${s}${fraction ? `.${String(fraction).padStart(2, "0")}` : ""}`;
}

/** "1:30", "90", "-0:05", "+5" or "0:10.03" to seconds. Null when it is not a time or is out of range. */
export function parseOffset(text: string): number | null {
  const match = /^([+-])?(?:(\d+):)?(\d+(?:\.\d{1,3})?)$/.exec(text.trim());
  if (!match) return null;
  const [, sign, minutes, seconds] = match;
  if (minutes !== undefined && Number(seconds) >= 60) return null;
  const total = Number(minutes ?? 0) * 60 + Number(seconds);
  const value = roundOffset(sign === "-" ? -total : total);
  return Math.abs(value) <= OFFSET_LIMIT ? value : null;
}

/** Opens the video at the sync point. A video that is not synced opens from the start. */
export function openUrl(videoUrl: string, canonicalOffset: number | null): string {
  return canonicalOffset === null ? videoUrl : `${videoUrl}#t=${Math.max(0, Math.floor(canonicalOffset))}`;
}
