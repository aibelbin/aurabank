import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Everything is served by this app. No CDN, no external hosts at runtime.
  poweredByHeader: false,
};

export default nextConfig;
