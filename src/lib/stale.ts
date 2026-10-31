/** How old a cached page may be, in milliseconds, before it is drawn again in the background. */
export const STALE_AFTER_MS = 10_000;

/**
 * True when a page drawn at `renderedAt` is old enough to refresh now.
 * `lastRefreshAt` is when the browser last asked, so a client clock that runs ahead of the
 * server's cannot start a refresh on every check: one refresh per window at most.
 */
export function needsRefresh(input: {
  renderedAt: number;
  now: number;
  lastRefreshAt: number | null;
  maxAgeMs?: number;
}): boolean {
  const { renderedAt, now, lastRefreshAt, maxAgeMs = STALE_AFTER_MS } = input;
  if (now - renderedAt <= maxAgeMs) return false;
  return lastRefreshAt === null || now - lastRefreshAt > maxAgeMs;
}
