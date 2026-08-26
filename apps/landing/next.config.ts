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
  async headers() {
    return [
      {
        /**
         * The one document this app serves, told not to sit in a CDN.
         *
         * Next marks a prerendered page `s-maxage=31536000` and expects the
         * host to purge it on deploy. Vercel does that for apps it hosts; here
         * it is only a proxy and never learns that fox rebuilt, so it went on
         * serving year-old HTML. That HTML carries the previous build's Server
         * Action ids and content-hashed script URLs, so after a redeploy the
         * page could neither hydrate nor submit — "Server Action not found".
         *
         * Only the document. Everything under /_next/static is content-hashed
         * and keeps its immutable year, which is where the bytes actually are:
         * the sheet, the fonts, the JavaScript. This costs one uncached 30KB
         * document per visit and buys correctness on every deploy.
         */
        source: "/",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
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
