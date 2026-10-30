/**
 * What can be read from a pasted maps link without any network call.
 * A full Google Maps place link carries the name and the coordinates in its path. A short link
 * (maps.app.goo.gl) hides them behind a redirect that the browser cannot follow, so it stays a plain link.
 */
export type MapsLink = {
  /** The place name from the link, when it has one. */
  name: string | null;
  /** True for a link that opens in a maps app. */
  isMaps: boolean;
  /** Where the link points, in degrees, when it says. Both or neither. */
  latitude: number | null;
  longitude: number | null;
};

const MAPS_HOSTS = ["maps.app.goo.gl", "goo.gl", "maps.google.com", "google.com", "www.google.com", "maps.apple.com", "waze.com"];

const SHORT_HOSTS = ["maps.app.goo.gl", "goo.gl"];

const NUMBER = "-?\\d+(?:\\.\\d+)?";
const EXACT = new RegExp(`!3d(${NUMBER})!4d(${NUMBER})`);
const CENTERED = new RegExp(`@(${NUMBER}),(${NUMBER})`);
const PAIR = new RegExp(`^(${NUMBER}),\\s*(${NUMBER})$`);

/** True for a short link that only a redirect can turn into a place. */
export function isShortMapsLink(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && SHORT_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

/** Degrees from two numbers in text, or null when they are not a point on the map. */
function point(lat: string, lng: string): { latitude: number; longitude: number } | null {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
}

/**
 * The coordinates in a Google Maps link. The place itself is in the data part of the path
 * (`!3d` latitude, `!4d` longitude). The `@` part is only where the map was centered, so it comes second.
 * A `q` of two numbers is a point too.
 */
function coordinates(url: URL): { latitude: number; longitude: number } | null {
  const exact = url.pathname.match(EXACT);
  if (exact) return point(exact[1], exact[2]);
  const centered = url.pathname.match(CENTERED);
  if (centered) return point(centered[1], centered[2]);
  const pair = (url.searchParams.get("q") ?? url.searchParams.get("query") ?? "").match(PAIR);
  return pair ? point(pair[1], pair[2]) : null;
}

export function parseMapsLink(value: string): MapsLink | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.replace(/^www\./, "");
  const isMaps = MAPS_HOSTS.some((h) => h.replace(/^www\./, "") === host) && (host !== "google.com" || url.pathname.startsWith("/maps"));
  if (!isMaps) return { name: null, isMaps: false, latitude: null, longitude: null };

  const where = coordinates(url) ?? { latitude: null, longitude: null };
  const place = url.pathname.match(/\/maps\/place\/([^/@]+)/);
  const query = url.searchParams.get("q") ?? url.searchParams.get("query");
  const raw = place?.[1] ?? query;
  if (!raw) return { name: null, isMaps: true, ...where };

  try {
    const name = decodeURIComponent(raw.replace(/\+/g, " ")).trim();
    // Coordinates are not a name.
    return { name: name && !PAIR.test(name) ? name : null, isMaps: true, ...where };
  } catch {
    return { name: null, isMaps: true, ...where };
  }
}
