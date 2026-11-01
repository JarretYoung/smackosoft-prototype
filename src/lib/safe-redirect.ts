/**
 * A redirect target that stays on this site. Anything else becomes the fallback.
 * Blocks absolute URLs, `//host` and backslash tricks that browsers read as a host.
 */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
