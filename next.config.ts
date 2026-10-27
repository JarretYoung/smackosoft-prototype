import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Pages here read the session, so they block by design. Only validate segments that opt in.
  experimental: {
    instantInsights: { validationLevel: "manual-warning" },
  },
};

export default nextConfig;
