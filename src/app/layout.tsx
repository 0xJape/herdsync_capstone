import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import PwaInstall from "@/components/pwa-install";
import "./globals.css";

export const metadata: Metadata = {
  title: "HerdSync",
  description: "Livestock management for MSU-GenSan Animal Science Farm",
  applicationName: "HerdSync",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "HerdSync", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: "/herdsync_logo.png",
    shortcut: "/herdsync_logo.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1f7a4d",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HerdSync" />
      </head>
      <body className="min-h-full flex flex-col">{children}<PwaInstall /></body>
    </html>
  );
}
