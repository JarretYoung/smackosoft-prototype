/**
 * The cookie that tells the server which timezone the viewer's browser is in. A browser does not
 * send its timezone with a request, so the page sets this once and keeps it right.
 * It is not a secret and the server checks the value before using it.
 */
export const ZONE_COOKIE = "tz";

const YEAR = 60 * 60 * 24 * 365;

/** The cookie text that stores `zone`. */
export const zoneCookie = (zone: string) => `${ZONE_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=${YEAR}; samesite=lax`;
