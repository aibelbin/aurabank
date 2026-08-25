import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const here = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Everything is served by this app. No CDN, no external hosts at runtime.
  poweredByHeader: false,
  // Bundles the server and only the dependencies it actually reaches, so the
  // runtime image carries no toolchain and no source tree.
  output: "standalone",
  // The shared design package ships TypeScript source rather than a build.
  transpilePackages: ["@aurabank/design"],
  // File tracing has to start at the workspace root, or the standalone output
  // misses everything that lives outside this app — the design package included.
  outputFileTracingRoot: path.join(here, "../../"),
  experimental: {
    // Detects a dropped connection and retries the navigation or server action
    // it blocked. On a phone that matters: a reply filed with one bar is sent
    // when the signal returns rather than silently doing nothing.
    useOffline: true,
  },
  async headers() {
    return [
      {
        // The worker must never be served stale, or a released fix cannot
        // reach a device that already installed the old one.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // The bank is never legitimately framed by anything.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
