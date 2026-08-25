import type { MetadataRoute } from "next";

/**
 * Installable, so the bank sits on a home screen next to the apps it is
 * pretending to be one of.
 *
 * No push notifications, deliberately: iOS delivers web push unreliably
 * enough that promising it would be worse than not having it. Unread state is
 * a count in the ledger's index instead, which is always true when you look.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AuraBank — The Clearing House",
    short_name: "AuraBank",
    description: "Claims are filed, heard, and settled. Aura is transferred, never issued.",
    // Members land on their own statement, not on a marketing page.
    start_url: "/statement",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafaf8",
    theme_color: "#fafaf8",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
