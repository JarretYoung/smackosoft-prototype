import { Suspense } from "react";

/**
 * Provides the Suspense boundary that lets pages under /friends read the
 * session at their top level — required by `cacheComponents`, which makes an
 * unbounded `cookies()` read a build error.
 *
 * This is NOT an auth check. A layout cannot gate its children: they render
 * regardless of what it returns, and it does not re-run on client-side
 * navigation between sibling routes. Each page gates itself, and pages that
 * fetch data get gated for free by going through `getAuthedClient()`.
 */
export default function AuthenticatedPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense>{children}</Suspense>;
}
