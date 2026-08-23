import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

/* Fonts are bundled and served by this app: no Google Fonts, no CDN, no
   external host of any kind. The page makes zero outbound requests, which
   lib/__tests__/local-only.test.ts enforces. */
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
  title: "AuraBank — The central bank of aura",
  description:
    "Aura is not created. It is transferred. File a claim, submit evidence, and settlement clears.",
  applicationName: "AuraBank",
  openGraph: {
    title: "AuraBank — The central bank of aura",
    description: "Aura is not created. It is transferred.",
    siteName: "AuraBank",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#fafaf8",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${interTight.variable} ${jetbrainsMono.variable}`}>
      <body className="text-ink antialiased">{children}</body>
    </html>
  );
}
