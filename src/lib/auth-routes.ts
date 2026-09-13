/**
 * Routes reachable without a session while the UI is being prototyped
 */
export const PUBLIC_ROUTES = [
  "/",
  // "/v2",
  // "/activities",
  // "/booking",
  // "/review",
  // "/more",
  // "/stats",
  // "/friends",
  // "/match",
];

/** Auth pages must stay reachable */
export const AUTH_ROUTES = ["/auth", "/login"];

export function isPublicRoute(pathname: string) {
  return [...PUBLIC_ROUTES, ...AUTH_ROUTES].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
