import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Everything is served by this app. No CDN, no external hosts at runtime.
  poweredByHeader: false,
  // Bundles the server and only the dependencies it actually reaches, so the
  // runtime image carries no toolchain and no source tree.
  output: "standalone",
};

export default nextConfig;
