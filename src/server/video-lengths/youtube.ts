import type { LengthSource } from "./types";

/** The Data API takes up to 50 ids in one call, for 1 quota unit. */
const BATCH = 50;
const TIMEOUT_MS = 8000;
const ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";

/**
 * Whole seconds in an ISO 8601 duration, the shape the Data API uses: `PT1H2M10S`, `PT45S`, `P1DT2H`.
 * Null when it is not a duration or is zero. A live stream that has not ended reports `P0D`.
 */
export function secondsOfIsoDuration(value: string): number | null {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value);
  if (!match) return null;
  const [days, hours, minutes, seconds] = match.slice(1).map((part) => Number(part ?? 0));
  const total = ((days * 24 + hours) * 60 + minutes) * 60 + seconds;
  return total > 0 ? total : null;
}

type VideosResponse = { items?: { id?: string; contentDetails?: { duration?: string } }[] };

/**
 * YouTube Data API v3, `videos.list` with `part=contentDetails`.
 * https://developers.google.com/youtube/v3/docs/videos/list
 * Without a key it reads nothing, so a machine with no key still saves videos, just with no length.
 */
export function youtubeLengths(options: { key: string | undefined; fetch?: typeof fetch }): LengthSource {
  return {
    id: "youtube",
    async lengthsOf(ids) {
      const found = new Map<string, number>();
      if (!options.key || !ids.length) return found;
      const get = options.fetch ?? fetch;
      for (let from = 0; from < ids.length; from += BATCH) {
        const chunk = ids.slice(from, from + BATCH);
        try {
          const url = `${ENDPOINT}?part=contentDetails&fields=items(id,contentDetails/duration)&id=${chunk.join(",")}`;
          const response = await get(url, { headers: { "x-goog-api-key": options.key }, signal: AbortSignal.timeout(TIMEOUT_MS) });
          if (!response.ok) {
            console.warn(`[video-lengths] youtube answered ${response.status}`);
            continue;
          }
          const body = (await response.json()) as VideosResponse;
          for (const item of body.items ?? []) {
            const seconds = item.id && item.contentDetails?.duration ? secondsOfIsoDuration(item.contentDetails.duration) : null;
            if (item.id && seconds) found.set(item.id, seconds);
          }
        } catch (error) {
          console.warn("[video-lengths] youtube could not be reached", error instanceof Error ? error.message : error);
        }
      }
      return found;
    },
  };
}
