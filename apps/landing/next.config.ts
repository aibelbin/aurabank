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
};

export default nextConfig;
