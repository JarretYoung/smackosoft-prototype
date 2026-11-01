const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/**
 * The origin the browser used, for links Supabase puts in emails and redirects.
 * The Origin header comes first, as the browser sets it on every action call.
 * Behind a proxy the forwarded headers say what the browser typed.
 */
export function originOf(header: (name: string) => string | null): string | null {
  const origin = header("origin");
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      // Fall through to the host headers.
    }
  }
  const host = header("x-forwarded-host") ?? header("host");
  if (!host) return null;
  const proto = header("x-forwarded-proto") ?? (LOCAL_HOST.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
