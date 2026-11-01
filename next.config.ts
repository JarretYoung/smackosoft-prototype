import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Supabase links point at 127.0.0.1 (its Site URL). Without this the dev server does not
  // hydrate pages opened on that address, and forms submit as a plain page load.
  allowedDevOrigins: ["127.0.0.1"],
  // Pages here read the session, so they block by design. Only validate segments that opt in.
  experimental: {
    instantInsights: { validationLevel: "manual-warning" },
    // How long the browser reuses a page it already fetched. `static` covers links with
    // `prefetch`, which are the three tabs. Everything else is `dynamic`, so forms and detail
    // pages always load fresh. A tab older than 10 s is redrawn in place (RefreshWhenStale).
    staleTimes: { dynamic: 0, static: 30 },
  },
};

export default nextConfig;
