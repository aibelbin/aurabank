import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Connectivity } from "@/components/chrome/Connectivity";
import "./globals.css";

/* Fonts are bundled and served by this app: no Google Fonts, no CDN, no
   external host of any kind. Each app carries its own copy rather than
   reaching into another app's tree — one owner per asset, as per database. */
const interTight = localFont({
  src: "./fonts/inter-tight-latin.woff2",
  variable: "--font-inter-tight",
  weight: "100 900",
  style: "normal",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Helvetica Neue", "Arial", "sans-serif"],
});

const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin.woff2",
  variable: "--font-jetbrains-mono",
  weight: "100 800",
  style: "normal",
  display: "swap",
  fallback: ["ui-monospace", "SF Mono", "Menlo", "Consolas", "monospace"],
});

export const metadata: Metadata = {
  title: "AuraBank — The Clearing House",
  description: "Claims are filed, heard, and settled. Every aura that moves came from somewhere.",
  applicationName: "AuraBank",
  // iOS does not read the manifest for the home-screen icon.
  appleWebApp: { capable: true, title: "AuraBank", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  // Behind a login: nothing here should be indexed or previewed.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#fafaf8",
  colorScheme: "light",
  // The fixed action bar sits on the safe area, so the page owns the notch.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${interTight.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-svh bg-paper text-ink antialiased">
        <Connectivity />
        {children}
      </body>
    </html>
  );
}
