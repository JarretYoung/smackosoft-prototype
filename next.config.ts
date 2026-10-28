import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Supabase links point at 127.0.0.1 (its Site URL). Without this the dev server does not
  // hydrate pages opened on that address, and forms submit as a plain page load.
  allowedDevOrigins: ["127.0.0.1"],
  // Pages here read the session, so they block by design. Only validate segments that opt in.
  experimental: {
    instantInsights: { validationLevel: "manual-warning" },
  },
};

export default nextConfig;
