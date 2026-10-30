import { isShortMapsLink, parseMapsLink, type MapsLink } from "./maps-link";

const MAX_HOPS = 4;

/**
 * The place behind a short maps link (its name and coordinates), or null. The browser cannot read the redirect,
 * so the server follows it one hop at a time. It only ever requests a short link host,
 * and stops at the first address that is not one, so a redirect cannot send it anywhere else.
 */
export async function resolveMapsShortLink(link: string, doFetch: typeof fetch = fetch): Promise<MapsLink | null> {
  let current = link.trim();
  if (!isShortMapsLink(current)) return null;

  for (let hop = 0; hop < MAX_HOPS && isShortMapsLink(current); hop++) {
    const response = await doFetch(current, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    const next = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !next) return null;
    current = new URL(next, current).toString();
  }

  const place = parseMapsLink(current);
  return place?.isMaps ? place : null;
}
