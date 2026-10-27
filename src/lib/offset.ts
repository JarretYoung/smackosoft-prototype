/** The farthest a sync point can be from the start of a video, in seconds. */
export const OFFSET_LIMIT = 30 * 60;

/** 10 as "0:10", -5 as "-0:05", 62 as "1:02". Whole seconds. */
export function formatOffset(seconds: number): string {
  const whole = Math.round(Math.abs(seconds));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  const sign = seconds < 0 && whole > 0 ? "-" : "";
  return `${sign}${m}:${String(s).padStart(2, "0")}`;
}

/** "1:30", "90", "-0:05" or "+5" to whole seconds. Null when it is not a time or is out of range. */
export function parseOffset(text: string): number | null {
  const match = /^([+-])?(?:(\d+):)?(\d+)$/.exec(text.trim());
  if (!match) return null;
  const [, sign, minutes, seconds] = match;
  if (minutes !== undefined && Number(seconds) > 59) return null;
  const total = Number(minutes ?? 0) * 60 + Number(seconds);
  const value = sign === "-" ? -total : total;
  return Math.abs(value) <= OFFSET_LIMIT ? value : null;
}

/** Opens the video at the sync point. A video that is not synced opens from the start. */
export function openUrl(videoUrl: string, offsetSeconds: number | null): string {
  return offsetSeconds === null ? videoUrl : `${videoUrl}#t=${Math.max(0, Math.floor(offsetSeconds))}`;
}
