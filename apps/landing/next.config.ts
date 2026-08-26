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
    serverActions: {
      /**
       * Every form here is a Server Action, and Next rejects one whose Origin
       * does not match its Host — a CSRF protection, and the right default.
       * Behind a proxy the two never match: the browser sends the public
       * domain and the server sees its own. Without these entries sign-in,
       * filing and the waitlist all fail with 403 and no useful message.
       *
       * Public hostnames only. Adding one here says "a form served from this
       * domain may post to me", so the list stays as short as the truth.
       */
      allowedOrigins: ["aurabank-one.vercel.app", "aurabank.tailcc00e1.ts.net"],
    },
  },
};

export default nextConfig;
